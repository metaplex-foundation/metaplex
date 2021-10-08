import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Button, InputNumber, Spin } from 'antd';
import { Link } from 'react-router-dom';

import {
  useConnection,
  useUserAccounts,
  MetaplexModal,
  MetaplexOverlay,
  formatAmount,
  formatTokenAmount,
  useMint,
  PriceFloorType,
  AuctionDataExtended,
  ParsedAccount,
  getAuctionExtended,
  programIds,
  AuctionState,
  BidderMetadata,
  MAX_METADATA_LEN,
  MAX_EDITION_LEN,
  Identicon,
  fromLamports,
  useWalletModal,
  VaultState,
  loadMultipleAccounts,
  BidStateType,
} from '@oyster/common';
import {
  AuctionView,
  AuctionViewState,
  useBidsForAuction,
  useUserBalance,
} from '../../hooks';
import { useWallet } from '@solana/wallet-adapter-react';
import { sendPlaceBid } from '../../actions/sendPlaceBid';
// import { bidAndClaimInstantSale } from '../../actions/bidAndClaimInstantSale';
import { AuctionCountdown, AuctionNumbers } from '../AuctionNumbers';
import {
  sendRedeemBid,
  eligibleForParticipationPrizeGivenWinningIndex,
} from '../../actions/sendRedeemBid';
import { sendCancelBid } from '../../actions/cancelBid';
import { startAuctionManually } from '../../actions/startAuctionManually';
import BN from 'bn.js';
import { Confetti } from '../Confetti';
import { QUOTE_MINT } from '../../constants';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useMeta } from '../../contexts';
import moment from 'moment';
import { AmountLabel } from '../AmountLabel';
import { HowAuctionsWorkModal } from '../HowAuctionsWorkModal';
import { AccountLayout, MintLayout } from '@solana/spl-token';
import { findEligibleParticipationBidsForRedemption } from '../../actions/claimUnusedPrizes';
import {
  BidRedemptionTicket,
  MAX_PRIZE_TRACKING_TICKET_SIZE,
  WinningConfigType,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { LoadingOutlined } from '@ant-design/icons';

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
  style,
  hideDefaultAction,
  action,
}: {
  auctionView: AuctionView;
  style?: React.CSSProperties;
  hideDefaultAction?: boolean;
  action?: JSX.Element;
}) => {
  const connection = useConnection();
  const { patchState, update } = useMeta();

  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );

  const mintInfo = useMint(auctionView.auction.info.tokenMint);
  const { prizeTrackingTickets, bidRedemptions } = useMeta();
  const bids = useBidsForAuction(auctionView.auction.pubkey);

  const [value, setValue] = useState<number>();
  const [loading, setLoading] = useState<boolean>(false);

  const [showRedeemedBidModal, setShowRedeemedBidModal] =
    useState<boolean>(false);
  const [showRedemptionIssue, setShowRedemptionIssue] =
    useState<boolean>(false);
  const [showBidPlaced, setShowBidPlaced] = useState<boolean>(false);
  const [showPlaceBid, setShowPlaceBid] = useState<boolean>(false);
  const [lastBid, setLastBid] = useState<{ amount: BN } | undefined>(undefined);

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [printingCost, setPrintingCost] = useState<number>();

  const { accountByMint } = useUserAccounts();

  const mintKey = auctionView.auction.info.tokenMint;
  const balance = useUserBalance(mintKey);

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

  const eligibleForAnything = winnerIndex !== null || eligibleForOpenEdition;
  const gapTime = (auctionView.auction.info.auctionGap?.toNumber() || 0) / 60;
  const gapTick = auctionExtended
    ? auctionExtended.info.gapTickSizePercentage
    : 0;
  const tickSize = auctionExtended ? auctionExtended.info.tickSize : 0;
  const tickSizeInvalid = !!(
    tickSize &&
    value &&
    (value * LAMPORTS_PER_SOL) % tickSize.toNumber() != 0
  );

  const gapBidInvalid = useGapTickCheck(value, gapTick, gapTime, auctionView);

  const isAuctionManagerAuthorityNotWalletOwner =
    auctionView.auctionManager.authority !== wallet?.publicKey?.toBase58();

  const isAuctionNotStarted =
    auctionView.auction.info.state === AuctionState.Created;

  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;
  const isStarted = auctionView.state === AuctionViewState.Live;
  const participationFixedPrice =
    auctionView.auctionManager.participationConfig?.fixedPrice || 0;
  const participationOnly =
    auctionView.auctionManager.numWinners.toNumber() === 0;

  const minBid =
    tickSize &&
    (isUpcoming || bids.length === 0
      ? fromLamports(
          participationOnly ? participationFixedPrice : priceFloor,
          mintInfo,
        )
      : isStarted && bids.length > 0
      ? parseFloat(formatTokenAmount(bids[0].info.lastBid, mintInfo))
      : 9999999) +
      tickSize.toNumber() / LAMPORTS_PER_SOL;

  const invalidBid =
    tickSizeInvalid ||
    gapBidInvalid ||
    !myPayingAccount ||
    value === undefined ||
    value * LAMPORTS_PER_SOL < priceFloor ||
    (minBid && value < minBid) ||
    loading ||
    !accountByMint.get(QUOTE_MINT.toBase58());

  useEffect(() => {
    if (wallet.connected) {
      if (wallet.publicKey && !showPlaceBid) setShowPlaceBid(true);
    } else {
      if (showPlaceBid) setShowPlaceBid(false);
    }
  }, [wallet.connected]);

  const instantSale = async () => {
    setLoading(true);

    try {
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

      // Placing a "bid" of the full amount results in a purchase to redeem.
      if (instantSalePrice && (allowBidToPublic || allowBidToAuctionOwner)) {
        let bidTxid: string | undefined;

        try {
          console.log('sendPlaceBid');
          const { amount, txid } = await sendPlaceBid(
            connection,
            wallet,
            myPayingAccount.pubkey,
            auctionView,
            accountByMint,
            instantSalePrice,
            'confirmed',
          );
          setLastBid({ amount });
          bidTxid = txid;
        } catch (e) {
          console.error('sendPlaceBid', e);
          return;
        }

        try {
          // Attempt to load the transaction, retrying up to 5 times
          retry: do {
            for (let i = 0; i < 5; ++i) {
              const tx = await connection.getTransaction(bidTxid, {
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

              const newState = patchState(patch);
              setLoading(true);

              {
                const auctionKey = auctionView.auction.pubkey;
                const auctionBidderKey = `${auctionKey}-${wallet.publicKey}`;

                auctionView.auction = newState.auctions[auctionKey];
                auctionView.myBidderPot =
                  newState.bidderPotsByAuctionAndBidder[
                    auctionBidderKey
                  ];
                auctionView.myBidderMetadata =
                  newState.bidderMetadataByAuctionAndBidder[
                    auctionBidderKey
                  ];
              }

              // Stop retrying on success
              break retry;
            }

            // Throw an error if we retry too many times
            throw new Error("Couldn't get PlaceBid transaction");
          } while (false);
        } catch (e) {
          console.error('update (post-sendPlaceBid)', e);
          return;
        }
      }

      // Claim the purchase
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
      } catch (e) {
        console.error('sendRedeemBid', e);
        setShowRedemptionIssue(true);
        return;
      }

      try {
        await update();
      } catch (e) {
        console.error('update (post-sendRedeemBid)', e);
        return;
      }

      setShowRedeemedBidModal(true);
    } finally {
      setLoading(false);
    }
  };

  const isOpenEditionSale =
    auctionView.auction.info.bidState.type === BidStateType.OpenEdition;
  const doesInstantSaleHasNoItems =
    Number(auctionView.myBidderPot?.info.emptied) !== 0 &&
    auctionView.auction.info.bidState.max.toNumber() === bids.length;

  const shouldHideInstantSale =
    !isOpenEditionSale &&
    auctionView.isInstantSale &&
    isAuctionManagerAuthorityNotWalletOwner &&
    doesInstantSaleHasNoItems;

  const shouldHide =
    shouldHideInstantSale ||
    auctionView.vault.info.state === VaultState.Deactivated;

  if (shouldHide) {
    return <></>;
  }

  return (
    <div className="auction-container" style={style}>
      <div className={'time-info'}>
        {!auctionView.isInstantSale && (
          <>
            <span>Auction ends in</span>
            <div>
              <AuctionCountdown auctionView={auctionView} labels={false} />
            </div>
          </>
        )}
      </div>
      <div className={'bid-info'}>
        <div className="bid-info-container">
          <AuctionNumbers
            auctionView={auctionView}
            showAsRow={true}
            hideCountdown={true}
            displaySOL={true}
          />
          {showPlaceBid &&
            !hideDefaultAction &&
            wallet.connected &&
            auctionView.auction.info.ended() && (
              <Button
                className="secondary-btn"
                disabled={
                  !myPayingAccount ||
                  (!auctionView.myBidderMetadata &&
                    isAuctionManagerAuthorityNotWalletOwner) ||
                  loading ||
                  !!auctionView.items.find(i => i.find(it => !it.metadata))
                }
                onClick={async () => {
                  setLoading(true);
                  setShowRedemptionIssue(false);
                  if (
                    wallet?.publicKey?.toBase58() ===
                    auctionView.auctionManager.authority
                  ) {
                    const totalCost =
                      await calculateTotalCostOfRedeemingOtherPeoplesBids(
                        connection,
                        auctionView,
                        bids,
                        bidRedemptions,
                      );
                    setPrintingCost(totalCost);
                    setShowWarningModal(true);
                  }
                  try {
                    if (eligibleForAnything) {
                      await sendRedeemBid(
                        connection,
                        wallet,
                        myPayingAccount.pubkey,
                        auctionView,
                        accountByMint,
                        prizeTrackingTickets,
                        bidRedemptions,
                        bids,
                      ).then(() => setShowRedeemedBidModal(true));
                    } else {
                      await sendCancelBid(
                        connection,
                        wallet,
                        myPayingAccount.pubkey,
                        auctionView,
                        accountByMint,
                        bids,
                        bidRedemptions,
                        prizeTrackingTickets,
                      );
                    }
                  } catch (e) {
                    console.error(e);
                    setShowRedemptionIssue(true);
                  }
                  setLoading(false);
                }}
              >
                {loading ||
                auctionView.items.find(i => i.find(it => !it.metadata)) ||
                !myPayingAccount ? (
                  <Spin />
                ) : eligibleForAnything ? (
                  `Redeem bid`
                ) : (
                  `${
                    wallet?.publicKey &&
                    auctionView.auctionManager.authority ===
                      wallet.publicKey.toBase58()
                      ? 'Reclaim Items'
                      : 'Refund bid'
                  }`
                )}
              </Button>
            )}
          {showPlaceBid ? (
            <div className="show-place-bid">
              <AmountLabel
                title="in your wallet"
                displaySOL={true}
                style={{ marginBottom: 0 }}
                amount={formatAmount(balance.balance, 2)}
                customPrefix={
                  <Identicon
                    address={wallet?.publicKey?.toBase58()}
                    style={{ width: 36 }}
                  />
                }
              />
            </div>
          ) : (
            <div className="actions-place-bid">
              <HowAuctionsWorkModal buttonClassName="black-btn" />
              {!hideDefaultAction &&
                !auctionView.auction.info.ended() &&
                (wallet.connected &&
                isAuctionNotStarted &&
                !isAuctionManagerAuthorityNotWalletOwner ? (
                  <Button
                    className="secondary-btn"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await startAuctionManually(
                          connection,
                          wallet,
                          auctionView,
                        );
                      } catch (e) {
                        console.error(e);
                      }
                      setLoading(false);
                    }}
                    style={{ marginTop: 20 }}
                  >
                    {loading ? <Spin /> : 'Start auction'}
                  </Button>
                ) : (
                  <Button
                    className="secondary-btn"
                    onClick={() => {
                      if (wallet.connected) setShowPlaceBid(true);
                      else connect();
                    }}
                  >
                    Place Bid
                  </Button>
                ))}
            </div>
          )}
        </div>
        {showPlaceBid &&
          !auctionView.isInstantSale &&
          !hideDefaultAction &&
          wallet.connected &&
          !auctionView.auction.info.ended() && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: '15px',
                marginBottom: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '15px',
              }}
            >
              <div
                style={{
                  margin: '0 0 12px 0',
                  letterSpacing: '0.02em',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '14px',
                  lineHeight: '14px',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                your bid
              </div>
              <div className={'bid-container'}>
                <div
                  style={{
                    width: '100%',
                    background: '#242424',
                    borderRadius: 14,
                    color: 'rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <InputNumber
                    autoFocus
                    className="input sol-input-bid"
                    value={value}
                    onChange={setValue}
                    precision={4}
                    style={{ fontSize: 16, lineHeight: '16px' }}
                    formatter={value =>
                      value
                        ? `◎ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                        : ''
                    }
                    placeholder={`Bid ${minBid} SOL or more`}
                  />
                </div>
                <div className={'bid-buttons'}>
                  <Button
                    className="metaplex-button-default"
                    style={{
                      background: 'transparent',
                      color: 'white',
                      width: 'unset',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      border: 'none',
                    }}
                    disabled={loading}
                    onClick={() => setShowPlaceBid(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="secondary-btn"
                    disabled={invalidBid}
                    onClick={async () => {
                      setLoading(true);
                      if (myPayingAccount && value) {
                        const bid = await sendPlaceBid(
                          connection,
                          wallet,
                          myPayingAccount.pubkey,
                          auctionView,
                          accountByMint,
                          value,
                        );
                        setLastBid(bid);
                        // setShowBidModal(false);
                        setShowBidPlaced(true);
                        setLoading(false);
                      }
                    }}
                  >
                    {loading || !accountByMint.get(QUOTE_MINT.toBase58()) ? (
                      <Spin />
                    ) : (
                      'Bid now'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        {!hideDefaultAction &&
          wallet.connected &&
          !auctionView.auction.info.ended() &&
          (isAuctionNotStarted && !isAuctionManagerAuthorityNotWalletOwner ? (
            <Button
              type="primary"
              size="large"
              className="action-btn"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await startAuctionManually(connection, wallet, auctionView);
                } catch (e) {
                  console.error(e);
                }
                setLoading(false);
              }}
              style={{ marginTop: 20 }}
            >
              {loading ? (
                <Spin indicator={<LoadingOutlined />} />
              ) : (
                'Start auction'
              )}
            </Button>
          ) : loading ? (
            <Spin />
          ) : (
            auctionView.isInstantSale && (
              <Button
                type="primary"
                size="large"
                className="ant-btn secondary-btn"
                disabled={loading}
                onClick={instantSale}
                style={{ marginTop: 20, width: '100%' }}
              >
                {!isAuctionManagerAuthorityNotWalletOwner
                  ? 'CLAIM ITEM'
                  : auctionView.myBidderPot
                  ? 'Claim Purchase'
                  : 'Buy Now'}
              </Button>
            )
          ))}
        {!hideDefaultAction && !wallet.connected && (
          <Button
            type="primary"
            size="large"
            className="action-btn"
            onClick={connect}
            style={{ marginTop: 20 }}
          >
            Connect wallet to{' '}
            {auctionView.isInstantSale ? 'purchase' : 'place bid'}
          </Button>
        )}
        {action}
        {showRedemptionIssue && (
          <span style={{ color: 'red' }}>
            There was an issue redeeming or refunding your bid. Please try
            again.
          </span>
        )}
        {tickSizeInvalid && tickSize && (
          <span style={{ color: 'red' }}>
            Tick size is ◎{tickSize.toNumber() / LAMPORTS_PER_SOL}.
          </span>
        )}
        {gapBidInvalid && (
          <span style={{ color: 'red' }}>
            Your bid needs to be at least {gapTick}% larger than an existing bid
            during gap periods to be eligible.
          </span>
        )}
        {!loading && value !== undefined && showPlaceBid && invalidBid && (
          <span style={{ color: 'red' }}>Invalid amount</span>
        )}
      </div>

      <MetaplexOverlay visible={showBidPlaced}>
        <Confetti />
        <h1
          style={{
            fontSize: '3rem',
            marginBottom: 20,
          }}
        >
          Nice bid!
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: '2rem',
          }}
        >
          Your bid of ◎ {formatTokenAmount(lastBid?.amount, mintInfo)} was
          successful
        </p>
        <Button onClick={() => setShowBidPlaced(false)} className="overlay-btn">
          Got it
        </Button>
      </MetaplexOverlay>

      <MetaplexOverlay visible={showRedeemedBidModal}>
        <Confetti />
        <h1
          style={{
            fontSize: '3rem',
            marginBottom: 20,
          }}
        >
          Congratulations
        </h1>
        <p
          style={{
            textAlign: 'center',
            fontSize: '2rem',
          }}
        >
          Your {auctionView.isInstantSale ? 'purchase' : 'bid'} has been
          redeemed please view your NFTs in <Link to="/artworks">My Items</Link>
          .
        </p>
        <Button
          onClick={() => setShowRedeemedBidModal(false)}
          className="overlay-btn"
        >
          Got it
        </Button>
      </MetaplexOverlay>

      <MetaplexModal
        visible={showWarningModal}
        onCancel={() => setShowWarningModal(false)}
        bodyStyle={{
          alignItems: 'start',
        }}
      >
        <h3 style={{ color: 'white' }}>
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
