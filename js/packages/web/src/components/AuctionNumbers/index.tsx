import {
  CountdownState,
  formatTokenAmount,
  fromLamports,
  PriceFloorType,
  useMint,
} from '@oyster/common';
import { Col, Row } from 'antd';
import React from 'react';
import { AuctionView, AuctionViewState, useBidsForAuction } from '../../hooks';
import { useAuctionCountdown } from '../../hooks/useAuctionCountdown';
import { AmountLabel } from '../AmountLabel';

export const AuctionCountdown = (props: {
  auctionView: AuctionView;
  labels: boolean;
}) => {
  const { auctionView } = props;
  const state = useAuctionCountdown(auctionView);
  const ended = isEnded(state);
  if (!props.labels) {
    return <Countdown state={state} />;
  }
  return (
    <Col span={ended ? 24 : 10}>
      <LabeledCountdown state={state} />
    </Col>
  );
};

export const AuctionNumbers = (props: {
  auctionView: AuctionView;
  hideCountdown?: boolean;
  showAsRow?: boolean;
  displaySOL?: boolean;
}) => {
  const { auctionView } = props;
  const state = useAuctionCountdown(auctionView);
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const mintInfo = useMint(auctionView.auction.info.tokenMint);

  const participationFixedPrice =
    auctionView.auctionManager.participationConfig?.fixedPrice || 0;
  const participationOnly =
    auctionView.auctionManager.numWinners.toNumber() === 0;
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;
  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;
  const isStarted = auctionView.state === AuctionViewState.Live;

  const ended = isEnded(state);

  return (
    <div>
      {(!ended || auctionView.isInstantSale) && (
        <>
          {(isUpcoming || bids.length === 0 || auctionView.isInstantSale) && (
            <AmountLabel
              displaySOL={props.displaySOL}
              title={auctionView.isInstantSale ? 'Price' : 'Starting bid'}
              amount={fromLamports(
                participationOnly ? participationFixedPrice : priceFloor,
                mintInfo,
              )}
            />
          )}
          {!auctionView.isInstantSale && isStarted && bids.length > 0 && (
            <AmountLabel
              displaySOL={props.displaySOL}
              title="Highest bid"
              amount={formatTokenAmount(bids[0].info.lastBid, mintInfo)}
            />
          )}
        </>
      )}
      {!ended && !props.hideCountdown ? (
        <AuctionCountdown auctionView={auctionView} labels={true} />
      ) : null}
    </div>
  );
};

const isEnded = (state?: CountdownState) =>
  state?.days === 0 &&
  state?.hours === 0 &&
  state?.minutes === 0 &&
  state?.seconds === 0;

const Countdown = ({ state }: { state?: CountdownState }) => {
  let localState = state;
  if (!localState) {
    localState = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }
  return (
    <Row>
      {localState.days > 0 && (
        <Col>
          <div>
            {localState.days}
            <span>days</span>
          </div>
        </Col>
      )}
      <Col>
        <div>
          {localState.hours}
          <span>hours</span>
        </div>
      </Col>
      <Col>
        <div>
          {localState.minutes}
          <span>min</span>
        </div>
      </Col>
      {!localState.days && (
        <Col>
          <div>
            {localState.seconds}
            <span>sec</span>
          </div>
        </Col>
      )}
    </Row>
  );
};

const LabeledCountdown = ({ state }: { state?: CountdownState }) => {
  return (
    <>
      <div>
        <>
          <div>Time left</div>
          {state &&
            (isEnded(state) ? (
              <Row>
                <div>This auction has ended</div>
              </Row>
            ) : (
              <Row>
                {state && state.days > 0 && (
                  <Col>
                    <div>
                      {state.days}
                      <span>:</span>
                    </div>
                    <div>days</div>
                  </Col>
                )}
                <Col>
                  <div>
                    {state.hours}
                    <span>:</span>
                  </div>
                  <div>hour</div>
                </Col>
                <Col>
                  <div>
                    {state.minutes}
                    {state.days === 0 && <span>:</span>}
                  </div>
                  <div>mins</div>
                </Col>
                {!state.days && (
                  <Col>
                    <div>{state.seconds}</div>
                    <div>secs</div>
                  </Col>
                )}
              </Row>
            ))}
        </>
      </div>
    </>
  );
};
