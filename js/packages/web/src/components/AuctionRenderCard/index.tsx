import React, { useEffect, useState } from 'react';
import { Card, CardProps } from 'antd';
import {
  formatTokenAmount,
  CountdownState,
  PriceFloorType,
  fromLamports,
  useMint,
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
  const mintInfo = useMint(auctionView.auction.info.tokenMint);

  const participationFixedPrice =
    auctionView.auctionManager.participationConfig?.fixedPrice || 0;
  const participationOnly = auctionView.auctionManager.numWinners.eq(new BN(0));
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;
  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;

  const winningBid = auctionView.auction.info.bidState.getAmountAt(0);
  const ended =
    !auctionView.isInstantSale &&
    state?.hours === 0 &&
    state?.minutes === 0 &&
    state?.seconds === 0;

  let currentBid: number | string = 0;
  let label = '';
  if (isUpcoming) {
    label = ended
      ? 'Ended'
      : auctionView.isInstantSale
      ? 'Price'
      : 'Starting bid';
    currentBid = fromLamports(
      participationOnly ? participationFixedPrice : priceFloor,
      mintInfo,
    );
  }

  if (!isUpcoming) {
    label = ended ? 'Winning bid' : 'Current bid';
    currentBid = winningBid ? formatTokenAmount(winningBid) : 'No Bid';
  }

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
        <span className={'text-uppercase info-message'}>{label}</span>
        <AmountLabel
          containerStyle={{ flexDirection: 'row' }}
          title={label}
          amount={currentBid}
          iconSize={24}
          ended={ended}
        />
      </div>
    </Card>
  );

  return card;
};
