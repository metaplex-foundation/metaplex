import { LoadingOutlined } from '@ant-design/icons';
import {
  AuctionDataExtended,
  AuctionState,
  BidderMetadata,
  BidRedemptionTicket,
  BidStateType,
  formatTokenAmount,
  fromLamports,
  getAuctionExtended,
  getTwitterHandle,
  Identicon,
  loadMultipleAccounts,
  MAX_EDITION_LEN,
  MAX_METADATA_LEN,
  MAX_PRIZE_TRACKING_TICKET_SIZE,
  MetaplexModal,
  ParsedAccount,
  PriceFloorType,
  programIds,
  shortenAddress,
  Storefront,
  useConnection,
  useMint,
  useStore,
  useUserAccounts,
  useWalletModal,
  VaultState,
  WinningConfigType,
} from '@oyster/common';
import cx from 'classnames';
import { last } from 'lodash';
import Bugsnag from '@bugsnag/browser';
import { useNavigate } from 'react-router-dom';
import { AccountLayout, MintLayout } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  Button,
  Card,
  Col,
  InputNumber,
  Row,
  Space,
  Spin,
  Typography,
  notification,
} from 'antd';
import moment from 'moment';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { sendCancelBidOrReclaimItems } from '../../actions/cancelBid';
import { findEligibleParticipationBidsForRedemption } from '../../actions/claimUnusedPrizes';
import { sendPlaceBid } from '../../actions/sendPlaceBid';
import {
  eligibleForParticipationPrizeGivenWinningIndex,
  sendRedeemBid,
} from '../../actions/sendRedeemBid';
import { startAuctionManually } from '../../actions/startAuctionManually';
import { QUOTE_MINT } from '../../constants';
import { useAnalytics, useMeta } from '../../contexts';
import {
  AuctionView,
  AuctionViewState,
  useBidsForAuction,
  useUserBalance,
  useWinningBidsForAuction,
} from '../../hooks';

import { AuctionCountdown } from '../AuctionNumbers';
import { HowAuctionsWorkModal } from '../HowAuctionsWorkModal';
import { endSale } from './utils/endSale';
import { DateTime } from 'luxon';
import { ChevronRightIcon } from '@heroicons/react/solid';
import { CrossMintButton } from '@crossmint/client-sdk-react-ui';

const { Text } = Typography;

type NotificationMessage = {
  message: string;
  description: string | ReactNode;
};
type CancelSuccessMessages = {
  refunded: NotificationMessage;
  reclaimed: NotificationMessage;
};

const cancelBidMessages = {
  refunded: {
    message: 'Bid Refunded',
    description:
      'Your bid was refunded. Check your wallet for the transaction history.',
  },
  reclaimed: {
    message: 'NFT Reclaimed',
    description: (
      <Space direction="vertical">
        <Text>Your NFT was reclaimed from the listing vault.</Text>
      </Space>
    ),
  },
} as CancelSuccessMessages;

async function calculateTotalCostOfRedeemingOtherPeoplesBids(
  connection: Connection,
  auctionView: AuctionView,
  bids: ParsedAccount<BidderMetadata>[],
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
): Promise<number> {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );
  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  const metadataRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_METADATA_LEN,
  );
  const editionRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_EDITION_LEN,
  );
  const prizeTrackingTicketExempt =
    await connection.getMinimumBalanceForRentExemption(
      MAX_PRIZE_TRACKING_TICKET_SIZE,
    );

  const eligibleParticipations =
    await findEligibleParticipationBidsForRedemption(
      auctionView,
      bids,
      bidRedemptions,
    );
  const max = auctionView.auction.info.bidState.max.toNumber();
  let totalWinnerItems = 0;
  for (let i = 0; i < max; i++) {
    const winner = auctionView.auction.info.bidState.getWinnerAt(i);
    if (!winner) {
      break;
    } else {
      const bid = bids.find(b => b.info.bidderPubkey === winner);
      if (bid) {
        for (
          let j = 0;
          j < auctionView.auctionManager.safetyDepositBoxesExpected.toNumber();
          j++
        ) {
          totalWinnerItems += auctionView.auctionManager
            .getAmountForWinner(i, j)
            .toNumber();
        }
      }
    }
  }
  return (
    (mintRentExempt +
      accountRentExempt +
      metadataRentExempt +
      editionRentExempt +
      prizeTrackingTicketExempt) *
    (eligibleParticipations.length + totalWinnerItems)
  );
}
function useGapTickCheck(
  value: number | undefined,
  gapTick: number | null,
  gapTime: number,
  auctionView: AuctionView,
): boolean {
  return !!useMemo(() => {
    if (gapTick && value && gapTime && !auctionView.auction.info.ended()) {
      // so we have a gap tick percentage, and a gap tick time, and a value, and we're not ended - are we within gap time?
      const now = moment().unix();
      const endedAt = auctionView.auction.info.endedAt;
      if (endedAt) {
        const ended = endedAt.toNumber();
        if (now > ended) {
          const toLamportVal = value * LAMPORTS_PER_SOL;
          // Ok, we are in gap time, since now is greater than ended and we're not actually an ended auction yt.
          // Check that the bid is at least gapTick % bigger than the next biggest one in the stack.
          for (
            let i = auctionView.auction.info.bidState.bids.length - 1;
            i > -1;
            i--
          ) {
            const bid = auctionView.auction.info.bidState.bids[i];
            const expected = bid.amount.toNumber();
            if (expected < toLamportVal) {
              const higherExpectedAmount = expected * ((100 + gapTick) / 100);

              return higherExpectedAmount > toLamportVal;
            } else if (expected === toLamportVal) {
              // If gap tick is set, no way you can bid in this case - you must bid higher.
              return true;
            }
          }
          return false;
        } else {
          return false;
        }
      }
      return false;
    }
  }, [value, gapTick, gapTime, auctionView]);
}

function useAuctionExtended(
  auctionView: AuctionView,
): ParsedAccount<AuctionDataExtended> | undefined {
  const [auctionExtended, setAuctionExtended] =
    useState<ParsedAccount<AuctionDataExtended>>();
  const { auctionDataExtended } = useMeta();

  useMemo(() => {
    const fn = async () => {
      if (!auctionExtended) {
        const PROGRAM_IDS = programIds();
        const extendedKey = await getAuctionExtended({
          auctionProgramId: PROGRAM_IDS.auction,
          resource: auctionView.vault.pubkey,
        });
        const extendedValue = auctionDataExtended[extendedKey];
        if (extendedValue) setAuctionExtended(extendedValue);
      }
    };
    fn();
  }, [auctionDataExtended, auctionExtended, setAuctionExtended]);

  return auctionExtended;
}
export const AuctionCard = ({
  auctionView,
  hideDefaultAction,
  artDescription,
  artTitle,
  artImage
}: {
  auctionView: AuctionView;
  hideDefaultAction?: boolean;
  artDescription?: string
  artTitle?: string
  artImage?: string
}) => {
  const { storefront } = useStore();
  const connection = useConnection();
  const { patchState } = useMeta();

  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );
  const navigate = useNavigate();

  const mintInfo = useMint(auctionView.auction.info.tokenMint);
  const { prizeTrackingTickets, bidRedemptions } = useMeta();

  const [loading, setLoading] = useState<boolean>(false);

  const [showPlaceBidUI, setShowPlaceBidUI] = useState<boolean>(false);

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [printingCost, setPrintingCost] = useState<number>();
  const { track } = useAnalytics();

  const bids = useBidsForAuction(auctionView.auction.pubkey);
  // it looks like winners is calling useBidsForAuction again. Could be pretty easy to refactor, but afraid to touch it 😅
  const winners = useWinningBidsForAuction(auctionView.auction.pubkey);

  const { accountByMint } = useUserAccounts();

  const mintKey = auctionView.auction.info.tokenMint;
  const balance = useUserBalance(mintKey);

  const connectedWalletPublickKey = wallet?.publicKey?.toBase58();

  const myPayingAccount = balance.accounts[0];
  let winnerIndex: number | null = null;
  if (auctionView.myBidderPot?.pubkey)
    winnerIndex = auctionView.auction.info.bidState.getWinnerIndex(
      auctionView.myBidderPot?.info.bidderAct,
    );
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;
  const eligibleForOpenEdition = eligibleForParticipationPrizeGivenWinningIndex(
    winnerIndex,
    auctionView,
    auctionView.myBidderMetadata,
    auctionView.myBidRedemption,
  );
  const auctionExtended = useAuctionExtended(auctionView);

  const isAuctioneer =
    wallet?.publicKey &&
    auctionView.auctionManager.authority === connectedWalletPublickKey;

  const eligibleForAnything = winnerIndex !== null || eligibleForOpenEdition;

  const isAuctionNotStarted =
    auctionView.auction.info.state === AuctionState.Created;

  const isStarted = auctionView.state === AuctionViewState.Live;
  const participationFixedPrice =
    auctionView.auctionManager.participationConfig?.fixedPrice || 0;
  const participationOnly =
    auctionView.auctionManager.numWinners.toNumber() === 0;

  const lowestWinner = last(winners);
  const hasAllWinners =
    auctionView.auctionManager.numWinners.toNumber() === winners.length;

  let minBid = fromLamports(
    participationOnly ? participationFixedPrice : priceFloor,
    mintInfo,
  );
  const tickSize = auctionExtended ? auctionExtended.info.tickSize : 0;

  if (isStarted && hasAllWinners) {
    minBid = parseFloat(
      formatTokenAmount(lowestWinner?.info.lastBid.toNumber(), mintInfo),
    );

    if (tickSize) {
      minBid += fromLamports(tickSize) / LAMPORTS_PER_SOL;
    }
  }

  const isFirstBid = !auctionView.auction.info.bidState.bids.length;

  const minNextBid = parseFloat(
    isFirstBid
      ? minBid.toFixed(2)
      : !tickSize
      ? (minBid + 0.01).toFixed(2)
      : (minBid + fromLamports(tickSize)).toFixed(2),
  );

  const [value, setValue] = useState<number>(minBid);

  const gapTime = (auctionView.auction.info.auctionGap?.toNumber() || 0) / 60;
  const gapTick = auctionExtended
    ? auctionExtended.info.gapTickSizePercentage
    : 0;

  // JS MODULO OPERATOR DOES NOT WORK HOW YOU EXPECT IT TO
  // BREAKS WITH FLOATS, MULTIPLY AWAY ALL FLOATS
  // see this for some info https://stackoverflow.com/questions/3966484/why-does-modulus-operator-return-fractional-number-in-javascript
  const multiplier = 1000;
  const tickSizeInvalid = !!(
    tickSize &&
    value &&
    (value * multiplier) % (fromLamports(tickSize) * multiplier) != 0
  );

  const gapBidInvalid = useGapTickCheck(value, gapTick, gapTime, auctionView);
  const isAuctionManagerAuthorityNotWalletOwner =
    auctionView.auctionManager.authority !== connectedWalletPublickKey;

  const belowMinBid = value && minBid && value < minNextBid;

  const biddingPower =
    balance.balance +
    (auctionView.myBidderMetadata &&
    !auctionView.myBidderMetadata.info.cancelled
      ? auctionView.myBidderMetadata.info.lastBid.toNumber() / LAMPORTS_PER_SOL
      : 0);

  const notEnoughFundsToBid = !!value && value > biddingPower;
  const invalidBid =
    notEnoughFundsToBid ||
    gapBidInvalid ||
    tickSizeInvalid ||
    !myPayingAccount ||
    value === undefined ||
    value * LAMPORTS_PER_SOL < priceFloor ||
    belowMinBid ||
    loading ||
    !accountByMint.get(QUOTE_MINT.toBase58());

  useEffect(() => {
    if (wallet.connected) {
      if (wallet.publicKey && !showPlaceBidUI) setShowPlaceBidUI(true);
    } else {
      if (showPlaceBidUI) setShowPlaceBidUI(false);
    }
  }, [wallet.connected, wallet.publicKey]);

  useEffect(() => {
    // Sets the bid input field to the minimum bid automatically
    if (minNextBid > value) {
      setValue(minNextBid);
    }
  }, [minNextBid]);

  const endInstantSale = async () => {
    setLoading(true);

    try {
      try {
        // End the instant sale
        await endSale({
          auctionView,
          connection,
          accountByMint,
          bids,
          bidRedemptions,
          prizeTrackingTickets,
          wallet,
        });
      } catch (e: any) {
        notification.error({
          message: 'End Sale Error',
          duration: 30,
          description:
            'Unable to end the sale as an error occured. Please try again or reach out to support.',
        });
        Bugsnag.notify(e);
        return;
      }

      track('Listing Cancelled', {
        event_category: 'Listings',
        listingType: 'instant_sale',
        // nftAddress
        // auctionAddress
        // event_label: '' nft address
      });

      notification.success({
        message: 'Listing Ended',
        description: (
          <Space direction="vertical">
            <Text>
              The listing was successfully ended and the NFT reclaimed.
            </Text>
            <Button type="primary">View Owned</Button>
          </Space>
        ),
        onClick: () => {
          navigate('/owned');
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const instantSale = async () => {
    setLoading(true);

    try {
      // Step 1: Setup
      const instantSalePrice =
        auctionView.auctionDataExtended?.info.instantSalePrice;
      const winningConfigType =
        auctionView.participationItem?.winningConfigType ||
        auctionView.items[0][0].winningConfigType;
      const isAuctionItemMaster = [
        WinningConfigType.FullRightsTransfer,
        WinningConfigType.TokenOnlyTransfer,
      ].includes(winningConfigType);
      const allowBidToPublic =
        myPayingAccount &&
        !auctionView.myBidderPot &&
        isAuctionManagerAuthorityNotWalletOwner;
      const allowBidToAuctionOwner =
        myPayingAccount &&
        !isAuctionManagerAuthorityNotWalletOwner &&
        isAuctionItemMaster;

      // Step 2: Purchase
      // Placing a "bid" of the full amount results in a purchase to redeem.
      if (instantSalePrice && (allowBidToPublic || allowBidToAuctionOwner)) {
        let bidTxid: string | undefined;

        try {
          const { txid } = await sendPlaceBid(
            connection,
            wallet,
            myPayingAccount.pubkey,
            auctionView,
            accountByMint,
            instantSalePrice,
            'confirmed',
          );
          bidTxid = txid;
          track('Listing Bid Submitted', {
            event_category: 'Listings',
            listingType: 'instant_sale',
            event_label: 'instant_sale',
            // nftAddress
            // auctionAddress
            sol_value: value,
          });
        } catch (e: any) {
          console.error('sendPlaceBid instant sale', e);
          Bugsnag.notify(e);
          track('Error Listing Bid Submitted', {
            event_category: 'Listings',
            listingType: 'instant_sale',
            event_label: 'instant_sale',
            // nftAddress
            // auctionAddress
            sol_value: value,
          });

          return;
        }

        try {
          // Attempt to load the transaction, retrying up to 5 times
          const tryPatchMeta = async (txid: string) => {
            for (let i = 0; i < 5; ++i) {
              const tx = await connection.getTransaction(txid, {
                commitment: 'confirmed',
              });

              const keys = tx?.transaction.message.accountKeys;

              if (!keys) {
                await new Promise(o => setTimeout(o, 2000));
                continue;
              }

              const patch = await loadMultipleAccounts(
                connection,
                keys.map(k => k.toBase58()),
                'confirmed',
              );

              patchState(patch);

              {
                const auctionKey = auctionView.auction.pubkey;
                const auctionBidderKey = `${auctionKey}-${wallet.publicKey}`;

                auctionView.auction = patch.auctions[auctionKey];
                auctionView.myBidderPot =
                  patch.bidderPotsByAuctionAndBidder[auctionBidderKey];
                auctionView.myBidderMetadata =
                  patch.bidderMetadataByAuctionAndBidder[auctionBidderKey];
              }

              // Stop retrying on success
              return;
            }

            // Throw an error if we retry too many times
            throw new Error("Couldn't get PlaceBid transaction");
          };

          await tryPatchMeta(bidTxid);
        } catch (e) {
          console.error('update (post-sendPlaceBid)', e);
          return;
        }
      }

      // Step 3: Claim the purchase
      try {
        await sendRedeemBid(
          connection,
          wallet,
          myPayingAccount.pubkey,
          auctionView,
          accountByMint,
          prizeTrackingTickets,
          bidRedemptions,
          bids,
        );

        notification.success({
          message: 'Purchase Success',
          description: (
            <Space direction="vertical">
              <Text>
                Congratulations, your purchase ticket was exchanged for the NFT.
              </Text>
              <Button type="primary">View Owned</Button>
            </Space>
          ),
          onClick: () => {
            navigate('/owned');
          },
        });
      } catch (err: any) {
        Bugsnag.notify(err);

        notification.error({
          message: 'Purchase Error',
          duration: 20,
          description:
            'Your purchase ticket was not redeemed for the NFT. Please try again or wait for support.',
        });
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const isOpenEditionSale =
    auctionView.auction.info.bidState.type === BidStateType.OpenEdition;
  const isBidderPotEmpty = auctionView.myBidderPot
    ? Boolean(auctionView.myBidderPot?.info.emptied)
    : true;
  const doesInstantSaleHasNoItems =
    isBidderPotEmpty &&
    auctionView.auctionManager.numWinners.toNumber() === bids.length;

  const shouldHideInstantSale =
    !isOpenEditionSale &&
    auctionView.isInstantSale &&
    isAuctionManagerAuthorityNotWalletOwner &&
    doesInstantSaleHasNoItems;

  const shouldHide =
    shouldHideInstantSale ||
    (auctionView.vault.info.state === VaultState.Deactivated &&
      isBidderPotEmpty);

  const disableRedeemReclaimRefundBtn =
    !myPayingAccount ||
    (!auctionView.myBidderMetadata &&
      isAuctionManagerAuthorityNotWalletOwner) ||
    loading ||
    !!auctionView.items.find(i => i.find(it => !it.metadata));

  const loadingRedeemReclaimRefundBtn =
    loading ||
    auctionView.items.find(i => i.find(it => !it.metadata)) ||
    !myPayingAccount;

  // Refund, reclaim, or redeem a bid
  const RedeemReclaimRefundBtn = (
    <div className="p-4">
      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        block
        disabled={disableRedeemReclaimRefundBtn}
        onClick={async () => {
          setLoading(true);

          // Redeem/Claim NFT
          if (eligibleForAnything) {
            try {
              await sendRedeemBid(
                connection,
                wallet,
                myPayingAccount.pubkey,
                auctionView,
                accountByMint,
                prizeTrackingTickets,
                bidRedemptions,
                bids,
              );

              notification.success({
                message: 'Bid Redeemed',
                duration: 30,
                description: (
                  <Space direction="vertical">
                    <Text>
                      Congratulations, your bid was redeemed for the NFT! See it
                      in your owned tab.
                    </Text>
                    <Button type="primary">View Owned</Button>
                  </Space>
                ),
                onClick: () => {
                  navigate('/owned');
                },
              });
            } catch (e: any) {
              Bugsnag.notify(e);
              notification.error({
                message: 'Bid Redemption Error',
                duration: 20,
                description:
                  'There was an error redeeming your bid. Please try again or reach out to support.',
              });
            }
          } else {
            // Reclaim items or Cancel bid
            try {
              // only Reclaim items // reclaimItems === isAuctioneer
              if (isAuctioneer) {
                const totalCost =
                  await calculateTotalCostOfRedeemingOtherPeoplesBids(
                    connection,
                    auctionView,
                    bids,
                    bidRedemptions,
                  );
                setPrintingCost(totalCost);
                // just showing the modal is enough because the user has to confirm the transaction in their wallet
                setShowWarningModal(true);
              }
              // A new check for wether the user is the auctioneer is made inside
              await sendCancelBidOrReclaimItems(
                connection,
                wallet,
                myPayingAccount.pubkey,
                auctionView,
                accountByMint,
                bids,
                bidRedemptions,
                prizeTrackingTickets,
              );

              const message =
                cancelBidMessages[isAuctioneer ? 'reclaimed' : 'refunded'];

              notification.success(message);
            } catch (e: any) {
              Bugsnag.notify(e);

              notification.error({
                message: isAuctioneer
                  ? 'Reclaim Items Error'
                  : 'Bid Refund Error',
                description:
                  (isAuctioneer
                    ? 'There was an error reclaiming your items.'
                    : 'There was an error refunding your bid.') +
                  ' Please try again or reach out to support.',
              });
            }
          }

          setLoading(false);
        }}
      >
        {loadingRedeemReclaimRefundBtn ? (
          <Spin indicator={<LoadingOutlined />} />
        ) : eligibleForAnything ? (
          `Claim NFT`
        ) : (
          `${isAuctioneer ? 'Reclaim Items' : 'Refund bid'}`
        )}
      </Button>
    </div>
  );

  // If the user is currently capable of acting on a live (or unstarted) listing
  const showDefaultNonEndedAction =
    !hideDefaultAction && wallet.connected && !auctionView.auction.info.ended();

  // If the user is capable of starting this auction
  const showStartAuctionBtn =
    isAuctionNotStarted && !isAuctionManagerAuthorityNotWalletOwner;

  // If the user can start this auction, or a bid can be placed on it
  const showStartOrPlaceBidBtns =
    showDefaultNonEndedAction &&
    (showStartAuctionBtn || !auctionView.isInstantSale);

  // If this is an instant sale and the user can end it
  const canEndInstantSale =
    auctionView.isInstantSale &&
    !isAuctionManagerAuthorityNotWalletOwner &&
    !auctionView.auction.info.ended();

  // Start the auction
  const StartAuctionBtn = (
    <Button
      className="metaplex-fullwidth p-4"
      type="primary"
      size="large"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await startAuctionManually(
            connection,
            wallet,
            auctionView.auctionManager.instance,
          );
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      }}
    >
      Start auction
    </Button>
  );

  // Show the place-bid UI
  const PlaceBidBtn = (
    <Button
      className="metaplex-fullwidth p-4"
      type="primary"
      size="large"
      onClick={() => {
        if (wallet.connected) setShowPlaceBidUI(true);
        else connect();
      }}
    >
      Place Bid
    </Button>
  );

  // Conduct an instant sale
  const InstantSaleBtn = (
    <Button
      className="metaplex-fullwidth p-4"
      type="primary"
      size="large"
      block
      loading={loading}
      onClick={canEndInstantSale ? endInstantSale : instantSale}
    >
      {!isAuctionManagerAuthorityNotWalletOwner
        ? canEndInstantSale
          ? 'End Sale & Claim Item'
          : 'Claim Item'
        : auctionView.myBidderPot
        ? 'Claim Purchase'
        : 'Buy Now'}
    </Button>
  );

  // Crossmint credit card checkout
  const maybeCrossMintButton = (auctionView: AuctionView, storefront: Storefront) => {
    if (auctionView.isInstantSale && storefront.integrations?.crossmintClientId) {

      return (
        <CrossMintButton
          listingId={auctionView.auction.pubkey}
          collectionDescription={artDescription || storefront.meta.description}
          collectionTitle={artTitle || storefront.meta.title}
          collectionPhoto={artImage || storefront.theme.logo}
          // todo -- rmv inline styles once this component is testable.
          style={{
            width: '100%',
            height: '40px',
            borderRadius: '2px',
            marginTop: '12px',
          }}
        />

      )
    }
  }

  // Components for inputting bid amount and placing a bid
  const PlaceBidUI = (
    <Space
      className="metaplex-fullwidth metaplex-space-align-stretch"
      direction="vertical"
    >
      <h5>{`Bid ${minNextBid} SOL or more`}</h5>
      <Row gutter={8} align="middle">
        <Col flex="1 0 auto">
          <InputNumber<number>
            decimalSeparator="."
            className="metaplex-fullwidth"
            step={minNextBid}
            autoFocus
            value={value}
            onChange={v => setValue(v)}
            precision={2}
            formatter={value => (value ? `◎ ${value}` : '')}
            placeholder={`Bid ${minNextBid} SOL or more`}
          />
        </Col>
        <Col flex="0 0 auto">
          <Button
            disabled={invalidBid}
            type="primary"
            loading={loading || !accountByMint.get(QUOTE_MINT.toBase58())}
            onClick={async () => {
              setLoading(true);

              if (!myPayingAccount || !value) {
                return;
              }

              try {
                await sendPlaceBid(
                  connection,
                  wallet,
                  myPayingAccount.pubkey,
                  auctionView,
                  accountByMint,
                  value,
                );

                notification.success({
                  message: 'Bid Submitted',
                  description:
                    'Your bid was accepted by the auctioneer. You may raise your bid at any time.',
                });
                setShowPlaceBidUI(false);
                track('Listing Bid Submitted', {
                  event_category: 'Listings',
                  listingType: 'auction',
                  event_label: 'auction',
                  sol_value: value,
                });
              } catch (e: any) {
                notification.error({
                  message: 'Bid Error',
                  description:
                    'There was an issue placing your bid. The bid was not accepted. Please try again or reach out to support.',
                });

                Bugsnag.notify(e);
                track('Error Listing Bid Submitted', {
                  event_category: 'Listings',
                  listingType: 'auction',
                  event_label: 'auction',
                  sol_value: value,
                });
              } finally {
                setShowPlaceBidUI(false);
                setLoading(false);
              }
            }}
          >
            Submit Bid
          </Button>
          <Button
            disabled={loading}
            type="text"
            onClick={() => setShowPlaceBidUI(false)}
          >
            Cancel
          </Button>
        </Col>
      </Row>
      {invalidBid && (
        <div className="metaplex-margin-top-4">
          {!loading && (
            <>
              {notEnoughFundsToBid && (
                <Text className="danger" type="danger">
                  You do not have enough funds to fulfill the bid. Your current
                  bidding power is {biddingPower} SOL.
                </Text>
              )}
              {value !== undefined && !!belowMinBid && (
                <Text className="danger" type="danger">
                  The bid must be at least {minNextBid} SOL.
                </Text>
              )}
              {!!value && tickSizeInvalid && tickSize && (
                <Text className="danger" type="danger">
                  Tick size is ◎{tickSize.toNumber() / LAMPORTS_PER_SOL}.
                </Text>
              )}
              {gapBidInvalid && (
                <Text className="danger" type="danger">
                  Your bid needs to be at least {gapTick}% larger than an
                  existing bid during gap periods to be eligible.
                </Text>
              )}
            </>
          )}
        </div>
      )}
    </Space>
  );

  const isAuctionOver = (x: AuctionView) =>
    x.auction.info.timeToEnd().days === 0 &&
    x.auction.info.timeToEnd().hours === 0 &&
    x.auction.info.timeToEnd().minutes === 0 &&
    x.auction.info.timeToEnd().seconds === 0;

  const mint = useMint(auctionView?.auction.info.tokenMint);

  const auctionEnded = auctionView.isInstantSale
    ? undefined
    : isAuctionOver(auctionView);

  const someoneWon = auctionEnded && bids.length;

  const showHowAuctionsWorkBtn = !showPlaceBidUI && !auctionView.isInstantSale;

  const actuallyShowStartAuctionBtn =
    showDefaultNonEndedAction && showStartAuctionBtn;

  const showInstantSaleButton =
    showDefaultNonEndedAction &&
    !showStartAuctionBtn &&
    auctionView.isInstantSale;
  // bidderpot did not seem to affect anything
  //  &&!isBidderPotEmpty;

  const actuallyShowPlaceBidUI =
    showDefaultNonEndedAction && showPlaceBidUI && !auctionView.isInstantSale;

  const showPlaceBidButton =
    !showPlaceBidUI && showStartOrPlaceBidBtns && !showStartAuctionBtn;

  const showConnectToBidBtn = !hideDefaultAction && !wallet.connected;

  // Show the refund/reclaim/reedem bid button
  const showRedeemReclaimRefundBtn =
    showPlaceBidUI &&
    !hideDefaultAction &&
    wallet.connected &&
    auctionView.auction.info.ended() &&
    !auctionView.myBidderMetadata?.info.cancelled;
  //&&
  // removes the redeem bid button if you never placed a bid in the first place
  // bids.some(bid => bid.info.bidderPubkey === connectedWalletPublickKey)
  // !(!eligibleForAnything && !isAuctioneer);
  // &&!isBidderPotEmpty;

  const duringAuctionNotConnected = !auctionEnded && !wallet.connected;

  return (
    <div>
      <Card
        bordered={false}
        className="metaplex-margin-bottom-4 auction-card"
        headStyle={{
          borderBottom: !someoneWon
            ? '0'
            : '1px solid var(--color-border, #121212)',
        }}
        bodyStyle={{
          padding: auctionEnded || (shouldHide && !winners.length) ? 0 : 24,
        }}
        title={
          <div className="">
            <span
              className={
                auctionEnded || auctionView.isInstantSale
                  ? ''
                  : 'text-sm opacity-75'
              }
            >
              {auctionEnded
                ? someoneWon
                  ? 'Winner' + (winners.length > 1 ? 's' : '')
                  : `Auction ended ${
                      auctionView.auction?.info?.endedAt
                        ? DateTime.fromMillis(
                            auctionView?.auction?.info?.endedAt.toNumber() *
                              1000,
                          ).toRelative()
                        : ''
                    }`
                : auctionView.isInstantSale
                ? 'Instant sale'
                : 'Ends in'}
            </span>
            {!auctionEnded && !auctionView.isInstantSale && (
              <div>
                <AuctionCountdown auctionView={auctionView} labels={false} />
              </div>
            )}
          </div>
        }
        extra={
          <div className="flex flex-col items-end">
            <span className="text-sm opacity-75">
              {someoneWon
                ? 'Sold for'
                : auctionView.isInstantSale
                ? 'Price'
                : bids.length
                ? 'Current bid'
                : 'Starting bid'}
            </span>
            {/* todo: reduce opacity if starting bid */}
            <div className={cx('flex items-center text-xl')}>
              <svg
                className="mx-[5px] h-4 w-4 opacity-75 stroke-color-text"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="8" r="7.5" />
                <circle cx="8" cy="8" r="3.5" />
              </svg>
              {someoneWon
                ? fromLamports(bids[0].info.lastBid.toNumber())
                : minBid
                ? minBid.toFixed(2)
                : 0}
            </div>
          </div>
        }
      >
        {/* After auction (comes first because winner list is on top) */}
        {someoneWon && mint
          ? winners.map(bid => (
              <WinnerProfile
                bidderPubkey={bid.info.bidderPubkey}
                key={bid.info.bidderPubkey}
              />
            ))
          : null}

        {!shouldHide && (
          <>
            {showRedeemReclaimRefundBtn && RedeemReclaimRefundBtn}

            {/* before auction */}
            {actuallyShowStartAuctionBtn && StartAuctionBtn}

            {/* During auction, not connected */}
            {duringAuctionNotConnected && (
              <>
                {showHowAuctionsWorkBtn && !auctionView.isInstantSale && (
                  <HowAuctionsWorkModal buttonBlock buttonSize="large" />
                )}
                {showConnectToBidBtn && (
                  <Button
                    className="metaplex-fullwidth metaplex-margin-top-4 metaplex-round-corners"
                    type="primary"
                    size="large"
                    onClick={connect}
                  >
                    Connect wallet to{' '}
                    {auctionView.isInstantSale ? 'purchase' : 'place bid'}
                  </Button>)}
              </>
            )}

            {/*  During auction, connected */}
            {showInstantSaleButton && (
                <>
                  {InstantSaleBtn}
                </>
              )}
            {showPlaceBidButton && PlaceBidBtn}
            {actuallyShowPlaceBidUI && PlaceBidUI}
            {maybeCrossMintButton(auctionView, storefront)}
          </>
        )}
      </Card>

      <MetaplexModal
        visible={showWarningModal}
        onCancel={() => setShowWarningModal(false)}
      >
        <h3>
          Warning: There may be some items in this auction that still are
          required by the auction for printing bidders&apos; limited or open
          edition NFTs. If you wish to withdraw them, you are agreeing to foot
          the cost of up to an estimated ◎
          <b>{(printingCost || 0) / LAMPORTS_PER_SOL}</b> plus transaction fees
          to redeem their bids for them right now.
        </h3>
      </MetaplexModal>
    </div>
  );
};

const WinnerProfile = ({
  bidderPubkey,
}: {
  handle?: string;
  bidderPubkey: string;
}) => {
  const connection = useConnection();
  const [bidderTwitterHandle, setBidderTwitterHandle] = useState('');
  useEffect(() => {
    getTwitterHandle(connection, bidderPubkey).then(
      tw => tw && setBidderTwitterHandle(tw),
    );
  }, []);
  return (
    <a href={`https://www.holaplex.com/profiles/${bidderPubkey}`}>
      <div className="flex items-center px-4 py-4 sm:px-6 cursor-pointer rounded-lg  group">
        <div className="min-w-0 flex-1 flex items-center transition-colors">
          <div className="flex-shrink-0 pr-4">
            <Identicon size={48} address={bidderPubkey} />
          </div>
          <div className="min-w-0 flex-1 flex justify-between group-hover:text-primary text-color-text">
            <div className="text-color-text">
              <p className=" font-medium  truncate flex items-center  group-hover:text-primary text-color-text">
                {bidderTwitterHandle || shortenAddress(bidderPubkey)}
              </p>
            </div>
          </div>
          <div className="flex items-center group-hover:text-primary text-color-text">
            <span className="block">View profile</span>
            <ChevronRightIcon
              className="h-5 w-5"
              viewBox="0 0 18 18"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </a>
  );
};
