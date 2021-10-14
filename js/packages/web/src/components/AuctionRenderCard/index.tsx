import React, { useEffect, useState } from 'react';
import { Card, CardProps } from 'antd';
import {
  CountdownState,
} from '@oyster/common';
import { ArtContent } from '../ArtContent';
import {
  AuctionView,
  AuctionViewState,
  useArt,
  useCreators,
} from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { BN } from 'bn.js';
import { MetaAvatar } from '../MetaAvatar';
import { AuctionCountdown } from '../AuctionNumbers';

import { useAuctionStatus } from './hooks/useAuctionStatus';
const { Meta } = Card;

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const creators = useCreators(auctionView);
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
    <Card hoverable={true} className={`auction-render-card`} bordered={false}>
      <div className={'card-art-info'}>
        <div className={'card-artist-info'}>
          <MetaAvatar creators={[creators[0]]} />
          <span className={'artist-name'}>
            {creators[0].name || creators[0].address?.substr(0, 6)}...
          </span>
        </div>
        <div className={'art-content-wrapper'}>
          <ArtContent
            className="auction-image no-events"
            preview={false}
            pubkey={id}
            allowMeshRender={false}
          />
        </div>
        <div className={'art-name'}>{name}</div>
        {!ended && (
          <div className={'art-auction-info'}>
            <span className={'info-message'}>ENDING IN</span>
            <AuctionCountdown auctionView={auctionView} labels={false} />
          </div>
        )}
      </div>
      <div className="card-bid-info">
        <span className={'text-uppercase info-message'}>{status}</span>
        <AmountLabel
          containerStyle={{ flexDirection: 'row' }}
          title={status}
          amount={amount}
          iconSize={24}
        />
      </div>
    </Card>
  );

  return card;
};
