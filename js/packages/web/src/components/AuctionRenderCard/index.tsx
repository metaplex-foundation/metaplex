import React, { useEffect, useState } from 'react';
import { Card, CardProps } from 'antd';
import { formatTokenAmount, CountdownState, PriceFloorType, fromLamports, useMint } from '@oyster/common';
import { ArtContent } from '../ArtContent';
import './index.less';
import { AuctionView, AuctionViewState, useArt, useBidsForAuction } from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { useHighestBidForAuction } from '../../hooks';

const { Meta } = Card;
export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  let { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const name = art?.title || ' ';
  const [state, setState] = useState<CountdownState>();
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const mintInfo = useMint(auctionView.auction.info.tokenMint);

  const participationFixedPrice =
    auctionView.auctionManager.info.settings.participationConfig?.fixedPrice ||
    0;
  const participationOnly =
    auctionView.auctionManager.info.settings.winningConfigs.length == 0;
  const priceFloor =
    auctionView.auction.info.priceFloor.type == PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;
  const isUpcoming = auctionView.state === AuctionViewState.Upcoming;
  const isStarted = auctionView.state === AuctionViewState.Live;

  const winningBid = useHighestBidForAuction(auctionView.auction.pubkey);
  const ended =
    state?.hours === 0 && state?.minutes === 0 && state?.seconds === 0;

  let currentBid: number | string = 0;
  let label = '';
  if(isUpcoming || bids) {
    label = 'Starting bid';
    currentBid = fromLamports(
      participationOnly ? participationFixedPrice : priceFloor,
      mintInfo,
    )
  }

  if (isStarted && bids.length > 0) {
    label = ended ? 'Winning bid' : 'Current bid';
    currentBid = winningBid &&
      Number.isFinite(winningBid.info.lastBid?.toNumber())
        ? formatTokenAmount(winningBid.info.lastBid)
        : 'No Bid'
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
    <Card
      hoverable={true}
      className={`art-card`}
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
        title={`${name}`}
        description={
          <>
            <h4 style={{ marginBottom: 0 }}>
              {label}
            </h4>
            <div className="bids">
              <AmountLabel
                style={{ marginBottom: 10 }}
                containerStyle={{ flexDirection: 'row' }}
                title={label}
                amount={currentBid}
              />
            </div>
            {/* {endAuctionAt && hasTimer && (
              <div className="cd-container">
                {hours === 0 && minutes === 0 && seconds === 0 ? (
                  <div className="cd-title">Finished</div>
                ) : (
                  <>
                    <div className="cd-title">Ending in</div>
                    <div className="cd-time">
                      {hours}h {minutes}m {seconds}s
                      pants
                    </div>
                  </>
                )}
              </div>
            )} */}
          </>
        }
      />
    </Card>
  );

  return card;
};
