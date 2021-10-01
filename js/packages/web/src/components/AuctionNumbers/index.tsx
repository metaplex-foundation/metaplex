import React from 'react';
import { Col, Row } from 'antd';
import { formatCountdownTime } from '@oyster/common';
import { AuctionViewState } from '../../graphql';
import { Auction } from '../../hooks';
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
        {(!ended || auctionView.isInstantSale) && (
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
