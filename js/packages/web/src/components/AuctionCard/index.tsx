import React, { useCallback, useMemo, useState } from 'react';
import { Col, Button, InputNumber, Spin } from 'antd';
import { MemoryRouter, Route, Redirect, Link } from 'react-router-dom';

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
  useWalletModal,
  VaultState,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { AuctionView, useBidsForAuction, useUserBalance } from '../../hooks';
import { sendPlaceBid } from '../../actions/sendPlaceBid';
// import { bidAndClaimInstantSale } from '../../actions/bidAndClaimInstantSale';
import { AuctionNumbers } from './../AuctionNumbers';
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
import { AccountLayout, MintLayout } from '@solana/spl-token';
import { findEligibleParticipationBidsForRedemption } from '../../actions/claimUnusedPrizes';
import {
  BidRedemptionTicket,
  MAX_PRIZE_TRACKING_TICKET_SIZE,
  WinningConfigType,
} from '@oyster/common/dist/lib/models/metaplex/index';

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
  const { update } = useMeta();

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
  const [showBidModal, setShowBidModal] = useState<boolean>(false);
  const [showRedeemedBidModal, setShowRedeemedBidModal] =
    useState<boolean>(false);
  const [showRedemptionIssue, setShowRedemptionIssue] =
    useState<boolean>(false);
  const [showBidPlaced, setShowBidPlaced] = useState<boolean>(false);
  const [lastBid, setLastBid] = useState<{ amount: BN } | undefined>(undefined);
  const [modalHistory, setModalHistory] = useState<any>();
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

  //if instant sale auction bid and claimed hide buttons
  if (
    (auctionView.isInstantSale &&
      Number(auctionView.myBidderPot?.info.emptied) !== 0 &&
      isAuctionManagerAuthorityNotWalletOwner &&
      auctionView.auction.info.bidState.max.toNumber() === bids.length) ||
    auctionView.vault.info.state === VaultState.Deactivated
  ) {
    return <></>;
  }

  return (
    <div className="auction-container" style={style}>
      <Col>
        {!auctionView.isInstantSale && (
          <>
            <AuctionNumbers auctionView={auctionView} />
            <br />
          </>
        )}
        {showRedemptionIssue && (
          <span>
            There was an issue redeeming or refunding your bid. Please try
            again.
          </span>
        )}
        {!hideDefaultAction &&
          wallet.connected &&
          auctionView.auction.info.ended() && (
            <Button
              type="primary"
              size="large"
              className="action-btn"
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
              style={{ marginTop: 20 }}
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
              {loading ? <Spin /> : 'Start auction'}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              className="action-btn"
              disabled={loading}
              onClick={() => setShowBidModal(true)}
              style={{ marginTop: 20 }}
            >
              {loading ? (
                <Spin />
              ) : auctionView.isInstantSale ? (
                !isAuctionManagerAuthorityNotWalletOwner ? (
                  'Claim item'
                ) : auctionView.myBidderPot ? (
                  'Claim Purchase'
                ) : (
                  'Buy Now'
                )
              ) : (
                'Place bid'
              )}
            </Button>
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
      </Col>

      <MetaplexOverlay visible={showBidPlaced}>
        <Confetti />
        <h1
          className="title"
          style={{
            fontSize: '3rem',
            marginBottom: 20,
          }}
        >
          Nice bid!
        </h1>
        <p
          style={{
            color: 'white',
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
          className="title"
          style={{
            fontSize: '3rem',
            marginBottom: 20,
          }}
        >
          Congratulations
        </h1>
        <p
          style={{
            color: 'white',
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
        visible={showBidModal}
        onCancel={() => setShowBidModal(false)}
        bodyStyle={{
          alignItems: 'start',
        }}
        afterClose={() => modalHistory.replace('/placebid')}
      >
        <MemoryRouter>
          <Redirect to="/placebid" />

          <Route
            exact
            path="/placebid"
            render={({ history }) => {
              setModalHistory(history);
              const placeBid = async () => {
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
                  setShowBidModal(false);
                  setShowBidPlaced(true);
                  setLoading(false);
                }
              };

              const instantSale = async () => {
                setLoading(true);
                const instantSalePrice =
                  auctionView.auctionDataExtended?.info.instantSalePrice;
                const winningConfigType =
                  auctionView.items[0][0].winningConfigType;
                const isAuctionItemMaster =
                  winningConfigType === WinningConfigType.FullRightsTransfer ||
                  winningConfigType === WinningConfigType.TokenOnlyTransfer;
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
                  try {
                    const bid = await sendPlaceBid(
                      connection,
                      wallet,
                      myPayingAccount.pubkey,
                      auctionView,
                      accountByMint,
                      instantSalePrice,
                    );
                    setLastBid(bid);
                  } catch (e) {
                    console.error('sendPlaceBid', e);
                    setShowBidModal(false);
                    setLoading(false);
                    return;
                  }
                }

                const newAuctionState = await update(
                  auctionView.auction.pubkey,
                  wallet.publicKey,
                );
                auctionView.auction = newAuctionState[0];
                auctionView.myBidderPot = newAuctionState[1];
                auctionView.myBidderMetadata = newAuctionState[2];
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
                  ).then(async () => {
                    await update();
                    setShowBidModal(false);
                    setShowRedeemedBidModal(true);
                  });
                } catch (e) {
                  console.error(e);
                  setShowRedemptionIssue(true);
                }

                setLoading(false);
              };

              return (
                <>
                  <h2 className="modal-title">
                    {auctionView.isInstantSale
                      ? 'Confirm Purchase'
                      : 'Place a bid'}
                  </h2>
                  {!!gapTime && (
                    <div
                      className="info-content"
                      style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '0.9rem',
                      }}
                    >
                      Bids placed in the last {gapTime} minutes will extend
                      bidding for another {gapTime} minutes beyond the point in
                      time that bid was made.{' '}
                      {gapTick && (
                        <span>
                          Additionally, once the official auction end time has
                          passed, only bids {gapTick}% larger than an existing
                          bid will be accepted.
                        </span>
                      )}
                    </div>
                  )}
                  <AuctionNumbers auctionView={auctionView} />
                  <br />
                  {tickSizeInvalid && tickSize && (
                    <span style={{ color: 'red' }}>
                      Tick size is ◎{tickSize.toNumber() / LAMPORTS_PER_SOL}.
                    </span>
                  )}
                  {gapBidInvalid && (
                    <span style={{ color: 'red' }}>
                      Your bid needs to be at least {gapTick}% larger than an
                      existing bid during gap periods to be eligible.
                    </span>
                  )}

                  <div
                    style={{
                      width: '100%',
                      background: '#242424',
                      borderRadius: 14,
                      color: 'rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {!auctionView.isInstantSale && (
                      <InputNumber
                        autoFocus
                        className="input"
                        value={value}
                        style={{
                          width: '100%',
                          background: '#393939',
                          borderRadius: 16,
                        }}
                        onChange={setValue}
                        precision={4}
                        formatter={value =>
                          value
                            ? `◎ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                            : ''
                        }
                        placeholder="Amount in SOL"
                      />
                    )}
                    {!(auctionView.isInstantSale && bids.length > 0) && (
                      <>
                        <div
                          style={{
                            color: '#FFFFFF',
                            display: 'inline-block',
                            margin: '5px 20px',
                            fontWeight: 700,
                          }}
                        >
                          ◎ {formatAmount(balance.balance, 2)}{' '}
                          <span
                            style={{ color: '#717171', paddingLeft: '5px' }}
                          >
                            available
                          </span>
                        </div>
                        <Link
                          to="/addfunds"
                          style={{
                            float: 'right',
                            margin: '5px 20px',
                            color: '#5870EE',
                          }}
                        >
                          Add funds
                        </Link>
                      </>
                    )}
                  </div>

                  <br />
                  <Button
                    type="primary"
                    size="large"
                    className="action-btn"
                    onClick={() =>
                      auctionView.isInstantSale ? instantSale() : placeBid()
                    }
                    disabled={
                      tickSizeInvalid ||
                      gapBidInvalid ||
                      !myPayingAccount ||
                      (!auctionView.isInstantSale &&
                        (value === undefined ||
                          value * LAMPORTS_PER_SOL < priceFloor)) ||
                      loading ||
                      !accountByMint.get(QUOTE_MINT.toBase58())
                    }
                  >
                    {loading || !accountByMint.get(QUOTE_MINT.toBase58()) ? (
                      <Spin />
                    ) : auctionView.isInstantSale ? (
                      auctionView.myBidderPot ||
                      !isAuctionManagerAuthorityNotWalletOwner ? (
                        'Claim'
                      ) : (
                        'Purchase'
                      )
                    ) : (
                      'Place Bid'
                    )}
                  </Button>
                </>
              );
            }}
          />

          <Route exact path="/addfunds">
            <div style={{ maxWidth: '100%' }}>
              <h2>Add funds</h2>
              <p style={{ color: 'white' }}>
                We partner with <b>FTX</b> to make it simple to start purchasing
                digital collectibles.
              </p>
              <div
                style={{
                  width: '100%',
                  background: '#242424',
                  borderRadius: 12,
                  marginBottom: 10,
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Balance
                </span>
                <span>
                  {formatAmount(balance.balance, 2)}&nbsp;&nbsp;
                  <span
                    style={{
                      borderRadius: '50%',
                      background: 'black',
                      display: 'inline-block',
                      padding: '1px 4px 4px 4px',
                      lineHeight: 1,
                    }}
                  >
                    <img src="/sol.svg" width="10" />
                  </span>{' '}
                  SOL
                </span>
              </div>
              <p>
                If you have not used FTX Pay before, it may take a few moments
                to get set up.
              </p>
              <Button
                onClick={() => modalHistory.push('/placebid')}
                style={{
                  background: '#454545',
                  borderRadius: 14,
                  width: '30%',
                  padding: 10,
                  height: 'auto',
                }}
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  window.open(
                    `https://ftx.com/pay/request?coin=SOL&address=${wallet.publicKey?.toBase58()}&tag=&wallet=sol&memoIsRequired=false`,
                    '_blank',
                    'resizable,width=680,height=860',
                  );
                }}
                style={{
                  background: 'black',
                  borderRadius: 14,
                  width: '68%',
                  marginLeft: '2%',
                  padding: 10,
                  height: 'auto',
                  borderColor: 'black',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    placeContent: 'center',
                    justifyContent: 'center',
                    alignContent: 'center',
                    alignItems: 'center',
                    fontSize: 16,
                  }}
                >
                  <span style={{ marginRight: 5 }}>Sign with</span>
                  <img src="/ftxpay.png" width="80" />
                </div>
              </Button>
            </div>
          </Route>
        </MemoryRouter>
      </MetaplexModal>

      <MetaplexModal
        visible={showWarningModal}
        onCancel={() => setShowWarningModal(false)}
        bodyStyle={{
          alignItems: 'start',
        }}
      >
        <h3 style={{ color: 'white' }}>
          Warning: There may be some items in this auction that still are
          required by the auction for printing bidders' limited or open edition
          NFTs. If you wish to withdraw them, you are agreeing to foot the cost
          of up to an estimated ◎<b>{(printingCost || 0) / LAMPORTS_PER_SOL}</b>{' '}
          plus transaction fees to redeem their bids for them right now.
        </h3>
      </MetaplexModal>
    </div>
  );
};
