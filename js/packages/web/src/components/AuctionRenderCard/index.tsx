import React, { useEffect, useState } from 'react';
import { Card, CardProps } from 'antd';
import {
  CountdownState,
} from '@oyster/common';
import { ArtContent } from '../ArtContent';
import {
  AuctionView,
  useArt,
} from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { useAuctionStatus } from './hooks/useAuctionStatus';
const { Meta } = Card;

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const name = art?.title || ' ';
  const [_, setState] = useState<CountdownState>();

  const { status, amount } = useAuctionStatus(auctionView);

  const auction = auctionView.auction.info;

  useEffect(() => {
    const calc = () => {
      setState(auction.timeToEnd());
    };

    const interval = setInterval(() => {
      calc();
    }, 1000);

    calc();
    return () => clearInterval(interval);
  }, [auction, setState]);

  const card = (
    <Card
      hoverable
      className="art-card"
      cover={
        <>
          <ArtContent
            className="auction-image no-events"
            preview={false}
            pubkey={id}
            allowMeshRender={false}
          />
        </>
      }
    >
      <Meta
        title={name}
        description={
          <>
            <h4 style={{ marginBottom: 0 }}>{status}</h4>
            <div className="bids">
              <AmountLabel
                style={{ marginBottom: 10 }}
                containerStyle={{ flexDirection: 'row' }}
                title={status}
                amount={amount}
              />
            </div>
          </>
        }
      />
    </Card>
  );

  return card;
};
