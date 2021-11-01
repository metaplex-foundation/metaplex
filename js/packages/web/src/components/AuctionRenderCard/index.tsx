import {
  CountdownState,
} from '@oyster/common';
import { Card, CardProps } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  AuctionView,
  useArt,
  useCreators,
} from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { ArtContent } from '../ArtContent';
import { AuctionCountdown } from '../AuctionNumbers';
import { MetaAvatar } from '../MetaAvatar';
import { getHumanStatus, useAuctionStatus } from './hooks/useAuctionStatus';

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const creators = useCreators(auctionView);
  const name = art?.title || ' ';
  const [state, setState] = useState<CountdownState>();

  const ended =
    !auctionView.isInstantSale &&
    state?.hours === 0 &&
    state?.minutes === 0 &&
    state?.seconds === 0;
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
    <Card hoverable bordered={false}>
      <div>
      <div>
          <MetaAvatar creators={[creators[0]]} />
          <span>
            {creators[0]?.name || creators[0]?.address?.substr(0, 6)}...
          </span>
        </div>
        <div>
          <ArtContent preview={false} pubkey={id} allowMeshRender={false} />
        </div>
        <div>{name}</div>
        {!ended && (
          <div>
            <span>ENDING IN</span>
            <AuctionCountdown auctionView={auctionView} labels={false} />
          </div>
        )}
      </div>
      <div>
        <span>{humanStatus}</span>
        <AmountLabel title={humanStatus} amount={amount} />
      </div>
    </Card>
  );

  return card;
};
