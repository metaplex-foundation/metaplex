import React, { useEffect, useState } from 'react';
import { Card, CardProps, Row, Col, Statistic } from 'antd';
import { CountdownState } from '@oyster/common';
import { ArtContent } from '../ArtContent';
import { AuctionView, AuctionViewState, useArt } from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { getHumanStatus, useAuctionStatus } from './hooks/useAuctionStatus';
const { Meta } = Card;

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

const formatCountdown = (
  countdown: CountdownState = { days: 0, hours: 0, minutes: 0, seconds: 0 },
): string => {
  const parts = [
    countdown.days,
    countdown.hours,
    countdown.minutes,
    countdown.seconds,
  ];

  if (parts[0] === 0) parts.splice(0, 1);

  return parts.map(p => p.toFixed(0).padStart(2, '0')).join(':');
};

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const name = art?.title || ' ';
  const [countdown, setCountdown] = useState<CountdownState>();

  const { status, amount } = useAuctionStatus(auctionView);
  const humanStatus = getHumanStatus(status);

  const auction = auctionView.auction.info;

  useEffect(() => {
    const calc = () => {
      setCountdown(auction.timeToEnd());
    };

    const interval = setInterval(() => {
      calc();
    }, 1000);

    calc();
    return () => clearInterval(interval);
  }, [auction, setCountdown]);

  const card = (
    <div title={name}>
      <Card
        hoverable
        className="art-card"
        cover={
          <ArtContent
            className="auction-image no-events"
            preview={false}
            pubkey={id}
            allowMeshRender={false}
          />
        }
      >
        <Meta
          title={
            <Row align="top" wrap={false} style={{ fontFamily: 'inherit' }}>
              <Col
                flex="1 0 0"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                {name}
              </Col>
              {status.isLive && (
                <Col flex="0 0 auto">
                  <Statistic
                    style={{
                      opacity:
                        status.isInstantSale || status.hasBids
                          ? undefined
                          : 0.6,
                    }}
                    valueStyle={{
                      marginLeft: '.2em',
                      marginRight: 0,
                      lineHeight: '1.1em',
                      fontSize: 'inherit',
                    }}
                    className="create-statistic"
                    title={humanStatus}
                    value={amount}
                    prefix="◎"
                  />
                </Col>
              )}
            </Row>
          }
          description={
            <Row className="bids">
              <Col flex="1">
                {/* TODO: awful, horrible */}
                {status.isLive
                  ? status.isInstantSale
                    ? undefined
                    : 'Live'
                  : status.isInstantSale
                  ? status.soldOut
                    ? 'Sold out'
                    : 'Last sold'
                  : status.hasBids
                  ? 'Last sold'
                  : 'Ended'}
              </Col>
              <Col flex="0 1 auto">
                {/* TODO: also awful, also horrible */}
                {status.isLive ? (
                  status.isInstantSale ? (
                    'Buy now'
                  ) : (
                    formatCountdown(countdown)
                  )
                ) : status.isInstantSale || status.hasBids ? (
                  <>
                    {/* TODO: horrible hack because Statistic has a stupid !important style somewhere */}
                    <span
                      style={{
                        position: 'relative',
                        top: '-.1em',
                        marginLeft: '.4em',
                        marginRight: '.3em',
                      }}
                    >
                      ◎
                    </span>
                    {typeof amount === 'number' ? amount.toFixed(2) : amount}
                  </>
                ) : undefined}
              </Col>
            </Row>
          }
        />
      </Card>
    </div>
  );

  return card;
};
