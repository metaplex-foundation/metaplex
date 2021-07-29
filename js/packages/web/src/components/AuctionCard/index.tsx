import React, { useMemo, useState } from 'react';
import { Col, Button, InputNumber, Spin, Row, Skeleton } from 'antd';
import { MemoryRouter, Route, Redirect, Link } from 'react-router-dom';

import './index.less';
import {
  useConnection,
  useUserAccounts,
  contexts,
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
  Identicon,
  fromLamports,
} from '@oyster/common';
import {
  AuctionView,
  AuctionViewState,
  useBidsForAuction,
  useUserBalance,
} from '../../hooks';
import { sendPlaceBid } from '../../actions/sendPlaceBid';
import { AuctionCountdown, AuctionNumbers } from './../AuctionNumbers';
import {
  sendRedeemBid,
  eligibleForParticipationPrizeGivenWinningIndex,
} from '../../actions/sendRedeemBid';
import { sendCancelBid } from '../../actions/cancelBid';
import BN from 'bn.js';
import { Confetti } from '../Confetti';
import { QUOTE_MINT } from '../../constants';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useMeta } from '../../contexts';
import moment from 'moment';
import { AmountLabel } from '../AmountLabel';
import { useEffect } from 'react';

const { useWallet } = contexts.Wallet;

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
        const extendedValue = auctionDataExtended[extendedKey.toBase58()];
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
  const { wallet, connected, connect } = useWallet();
  const mintInfo = useMint(auctionView.auction.info.tokenMint);
  const [value, setValue] = useState<number>();
  const [loading, setLoading] = useState<boolean>(false);
  // const [showBidModal, setShowBidModal] = useState<boolean>(false);
  const [showRedeemedBidModal, setShowRedeemedBidModal] =
    useState<boolean>(false);
  const [showRedemptionIssue, setShowRedemptionIssue] =
    useState<boolean>(false);
  const [showBidPlaced, setShowBidPlaced] = useState<boolean>(false);
  const [showPlaceBid, setShowPlaceBid] = useState<boolean>(false);
  const [lastBid, setLastBid] = useState<{ amount: BN } | undefined>(undefined);
  // const [modalHistory, setModalHistory] = useState<any>();

  const { accountByMint } = useUserAccounts();

  const mintKey = auctionView.auction.info.tokenMint;
  const balance = useUserBalance(mintKey);

  const myPayingAccount = balance.accounts[0];
  let winnerIndex = null;
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

  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;
  const isStarted = auctionView.state === AuctionViewState.Live;
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const participationFixedPrice =
    auctionView.auctionManager.info.settings.participationConfig?.fixedPrice ||
    0;
  const participationOnly =
    auctionView.auctionManager.info.settings.winningConfigs.length === 0;

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
    if (wallet) {
      wallet.on('connect', () => {
        if (wallet.publicKey && !showPlaceBid) setShowPlaceBid(true);
      });
      wallet.on('disconnect', () => {
        if (showPlaceBid) setShowPlaceBid(false);
      });
    }
  }, [wallet]);

  return (
    <div className="auction-container" style={style}>
      <div className={'time-info'}>
        <span>Auction ends in</span>
        <div>
          <AuctionCountdown auctionView={auctionView} labels={false} />
        </div>
      </div>
      <div className={'bid-info'}>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
          }}
        >
          <AuctionNumbers
            auctionView={auctionView}
            showAsRow={true}
            hideCountdown={true}
            displaySOL={true}
          />
          {showPlaceBid ? (
            <div
              style={{
                flexGrow: 1,
                marginLeft: '30px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                paddingLeft: '30px',
              }}
            >
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Button
                style={{
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'rgb(255, 255, 255)',
                  width: 180,
                  height: 'fit-content',
                  border: 'none',
                }}
              >
                How Auctions Work
              </Button>
              {!hideDefaultAction && !auctionView.auction.info.ended() && (
                <Button
                  className="mcfarlane-button"
                  style={{
                    background: '#E65C37',
                    color: 'black',
                    width: 'unset',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                  }}
                  onClick={() => {
                    if (connected) setShowPlaceBid(true);
                    else connect();
                  }}
                >
                  Place Bid
                </Button>
              )}
              {!hideDefaultAction &&
                connected &&
                auctionView.auction.info.ended() && (
                  <Button
                    className="mcfarlane-button"
                    style={{
                      background: '#E65C37',
                      color: 'black',
                      width: 'unset',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                    }}
                    disabled={
                      !myPayingAccount ||
                      (!auctionView.myBidderMetadata &&
                        auctionView.auctionManager.info.authority.toBase58() !=
                          wallet?.publicKey?.toBase58()) ||
                      loading ||
                      !!auctionView.items.find(i => i.find(it => !it.metadata))
                    }
                    onClick={async () => {
                      setLoading(true);
                      setShowRedemptionIssue(false);
                      try {
                        if (eligibleForAnything)
                          await sendRedeemBid(
                            connection,
                            wallet,
                            myPayingAccount.pubkey,
                            auctionView,
                            accountByMint,
                          ).then(() => setShowRedeemedBidModal(true));
                        else
                          await sendCancelBid(
                            connection,
                            wallet,
                            myPayingAccount.pubkey,
                            auctionView,
                            accountByMint,
                          );
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
                      'Redeem bid'
                    ) : (
                      'Refund bid'
                    )}
                  </Button>
                )}
            </div>
          )}
        </div>
        {showPlaceBid &&
          !hideDefaultAction &&
          connected &&
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
                  margin: '0 0 10px 0',
                  letterSpacing: '0.02em',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  fontSize: '1rem',
                  lineHeight: '28px',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                your bid
              </div>
              <div
                style={{
                  display: 'flex',
                }}
              >
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
                    className="input"
                    value={value}
                    style={{
                      width: '100%',
                      background: '#393939',
                      borderRadius: 12,
                      border: '1px solid #E65C37',
                    }}
                    onChange={setValue}
                    precision={4}
                    formatter={value =>
                      value
                        ? `◎ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                        : ''
                    }
                    placeholder={`Bid ${minBid} SOL or more`}
                  />
                </div>

                <Button
                  className="mcfarlane-button"
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
                  className="mcfarlane-button"
                  style={{
                    background: '#E65C37',
                    color: 'black',
                    width: 'unset',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                  }}
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
          Your bid has been redeemed please view your NFTs in{' '}
          <Link to="/artwork">My Items</Link>.
        </p>
        <Button
          onClick={() => setShowRedeemedBidModal(false)}
          className="overlay-btn"
        >
          Got it
        </Button>
      </MetaplexOverlay>

      {/* <MetaplexModal
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

              return (
                <>
                  <h2 className="modal-title">Place a bid</h2>
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
                  <br />
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
                    <div
                      style={{
                        display: 'inline-block',
                        margin: '5px 20px',
                        fontWeight: 700,
                      }}
                    >
                      ◎ {formatAmount(balance.balance, 2)}{' '}
                      <span style={{ color: '#717171' }}>available</span>
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
                  </div>

                  <br />
                  <Button
                    type="primary"
                    size="large"
                    className="action-btn"
                    onClick={placeBid}
                    disabled={
                      tickSizeInvalid ||
                      gapBidInvalid ||
                      !myPayingAccount ||
                      value === undefined ||
                      value * LAMPORTS_PER_SOL < priceFloor ||
                      loading ||
                      !accountByMint.get(QUOTE_MINT.toBase58())
                    }
                  >
                    {loading || !accountByMint.get(QUOTE_MINT.toBase58()) ? (
                      <Spin />
                    ) : (
                      'Place bid'
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
                    `https://ftx.com/pay/request?coin=SOL&address=${wallet?.publicKey?.toBase58()}&tag=&wallet=sol&memoIsRequired=false`,
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
      </MetaplexModal> */}
    </div>
  );
};
