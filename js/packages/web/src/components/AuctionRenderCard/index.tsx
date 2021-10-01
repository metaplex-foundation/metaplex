import React, { FC, useEffect, useState } from 'react';
import { Card, CardProps } from 'antd';
import {
  formatTokenAmount,
  fromLamports,
  timeToAuctionEnd,
} from '@oyster/common';
import { ArtContent } from '../ArtContent/next';
import {} from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { BN } from 'bn.js';
import { Auction, AuctionViewState, PriceFloorType } from '../../graphql';

export interface AuctionCard extends CardProps {
  auction: Auction;
}

export const AuctionRenderCard: FC<AuctionCard> = ({ auction }) => {
  const art = auction.thumbnail;
  const label = useAuctionLabel(auction);
  const currentBid = useAuctionCurrentAmount(auction);

  return (
    <Card
      hoverable={true}
      className={`art-card`}
      cover={
        <>
          <ArtContent
            className="auction-image no-events"
            preview={false}
            allowMeshRender={false}
            uri={art?.uri}
          />
        </>
      }
    >
      <Card.Meta
        title={`${art?.title || ' '}`}
        description={
          <>
            <h4 style={{ marginBottom: 0 }}>{label}</h4>
            <div className="bids">
              <AmountLabel
                style={{ marginBottom: 10 }}
                containerStyle={{ flexDirection: 'row' }}
                title={label}
                amount={currentBid || 'No Bid'}
              />
            </div>
          </>
        }
      />
    </Card>
  );
};

export const useAuctionCurrentAmount = (auction: Auction) => {
  // TODO: check mintInfo
  // skipped if all === true else load separatelly
  const mintInfo = undefined; // useMint(auction.tokenMint);

  const participationOnly = auction.numWinners.eq(new BN(0));
  const participationFixedPrice =
    auction.manager.participationConfig?.fixedPrice?.toNumber() || 0;
  const priceFloor =
    auction.priceFloor?.type === PriceFloorType.Minimum
      ? auction.priceFloor.minPrice?.toNumber() || 0
      : 0;

  const isUpcoming = auction.viewState === AuctionViewState.Upcoming;
  const winningBid = auction.highestBid;

  if (isUpcoming || !winningBid) {
    return fromLamports(
      participationOnly ? participationFixedPrice : priceFloor,
      mintInfo,
    );
  }
  return winningBid && Number.isFinite(winningBid.lastBid?.toNumber())
    ? formatTokenAmount(winningBid.lastBid, mintInfo)
    : null;
};

export const useAuctionLabel = (auction: Auction) => {
  const { ended } = useAuctionEnded(auction);

  const isUpcoming = auction.viewState === AuctionViewState.Upcoming;
  const winningBid = auction.highestBid;

  if (isUpcoming || !winningBid) {
    return ended ? 'Ended' : 'Starting bid';
  }

  return ended ? 'Winning bid' : 'Current bid';
};

export const useAuctionEnded = (auction: Auction) => {
  const [state, setState] = useState<{
    timeToEnd: number | null;
    ended: boolean;
  }>({ timeToEnd: null, ended: false });

  useEffect(() => {
    const calc = () => {
      const timeToEnd = timeToAuctionEnd(auction);
      const ended = timeToEnd !== null && timeToEnd <= 0;

      setState({ timeToEnd, ended });
    };

    const interval = setInterval(calc, 1000);

    calc();
    return () => clearInterval(interval);
  }, [auction, setState]);

  return state;
};
