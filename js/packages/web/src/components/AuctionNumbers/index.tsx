import React from 'react';
import { Col, Row } from 'antd';
import { formatCountdownTime } from '@oyster/common';
import { AuctionViewState, Auction } from '../../graphql';
import { AmountLabel } from '../AmountLabel';
import { useAuctionCurrentAmount, useAuctionEnded } from '../AuctionRenderCard';
import { Countdown } from './Countdown';

export const AuctionNumbers = ({ auction }: { auction: Auction }) => {
  const amount = useAuctionCurrentAmount(auction);

  const isUpcoming = auction.viewState === AuctionViewState.Upcoming;

  const { ended, timeToEnd } = useAuctionEnded(auction);

  const label =
    isUpcoming || !auction.highestBid ? 'Starting bid' : 'Highest bid';

  return (
    <div style={{ minWidth: 350 }}>
      <Row>
        {!ended && (
          <Col span={12}>
            <AmountLabel
              style={{ marginBottom: 10 }}
              containerStyle={{ flexDirection: 'column' }}
              title={label}
              amount={amount || 0}
            />
          </Col>
        )}

        <Col span={ended ? 24 : 12}>
          <Countdown state={formatCountdownTime(timeToEnd || 0)} />
        </Col>
      </Row>
    </div>
  );
};
