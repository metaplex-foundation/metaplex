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
import './index.less';
import {
  AuctionView,
  AuctionViewState,
  useArt,
  useBidsForAuction,
  useCreators,
} from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { useHighestBidForAuction } from '../../hooks';
import { MetaAvatar } from '../MetaAvatar';
import { AuctionCountdown } from '../AuctionNumbers';

const { Meta } = Card;
export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  let { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const creators = useCreators(auctionView);
  const name = art?.title || ' ';
  const [state, setState] = useState<CountdownState>();
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const mintInfo = useMint(auctionView.auction.info.tokenMint);

  const participationFixedPrice =
    auctionView.auctionManager.info.settings.participationConfig?.fixedPrice ||
    0;
  const participationOnly =
    auctionView.auctionManager.info.settings.winningConfigs.length === 0;
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;
  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;

  const winningBid = useHighestBidForAuction(auctionView.auction.pubkey);
  const ended =
    state?.hours === 0 && state?.minutes === 0 && state?.seconds === 0;

  let currentBid: number | string = 0;
  let label = '';
  if (isUpcoming || bids) {
    label = ended ? 'Ended' : 'Starting bid';
    currentBid = fromLamports(
      participationOnly ? participationFixedPrice : priceFloor,
      mintInfo,
    );
  }

  if (!isUpcoming && bids.length > 0) {
    label = ended ? 'Winning bid' : 'Current bid';
    currentBid =
      winningBid && Number.isFinite(winningBid.info.lastBid?.toNumber())
        ? formatTokenAmount(winningBid.info.lastBid)
        : 'No Bid';
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
    <Card hoverable={true} className={`auction-render-card`}>
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
        <div className={'art-auction-info'}>
          ENDING IN
          <AuctionCountdown auctionView={auctionView} labels={false} />
        </div>
      </div>
      <div className="card-bid-info">
        <span className={'text-uppercase'}>{label}</span>
        <AmountLabel
          containerStyle={{ flexDirection: 'row' }}
          title={label}
          amount={currentBid}
        />
      </div>
    </Card>
  );

  return card;
};
