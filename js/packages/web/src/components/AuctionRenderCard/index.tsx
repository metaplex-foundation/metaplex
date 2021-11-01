import {
  CountdownState,
  formatTokenAmount,
  fromLamports,
  PriceFloorType,
  useMint,
} from '@oyster/common';
import { Card, CardProps, Divider, Space } from 'antd';
import { BN } from 'bn.js';
import React, { useEffect, useState } from 'react';
import {
  AuctionView,
  AuctionViewState,
  useArt,
  useBidsForAuction,
  useCreators,
  useHighestBidForAuction,
} from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { ArtContent } from '../ArtContent';
import { AuctionCountdown } from '../AuctionNumbers';
import { MetaAvatar } from '../MetaAvatar';

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
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const mintInfo = useMint(auctionView.auction.info.tokenMint);

  const participationFixedPrice =
    auctionView.auctionManager.participationConfig?.fixedPrice || 0;
  const participationOnly = auctionView.auctionManager.numWinners.eq(new BN(0));
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;
  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;

  const winningBid = useHighestBidForAuction(auctionView.auction.pubkey);
  const ended =
    !auctionView.isInstantSale &&
    state?.hours === 0 &&
    state?.minutes === 0 &&
    state?.seconds === 0;

  let currentBid: number | string = 0;
  let label = '';
  if (isUpcoming || bids) {
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
    <Card hoverable={true} bordered={false}>
      <Space direction="vertical">
        <Space direction="horizontal">
          <MetaAvatar creators={[creators[0]]} />
          <span>
            {creators[0].name || creators[0].address?.substr(0, 6)}...
          </span>
        </Space>

        <ArtContent preview={false} pubkey={id} allowMeshRender={false} />
        <h3>{name}</h3>

        {!auctionView.isInstantSale && !ended && (
          <div>
            <h5>ENDING IN</h5>
            <AuctionCountdown auctionView={auctionView} labels={false} />
          </div>
        )}
      </Space>
      <Divider />
      <AmountLabel key={0} title={label} amount={currentBid} />
    </Card>
  );

  return card;
};
