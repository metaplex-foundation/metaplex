import React, { useEffect, useState } from 'react';
import { Card, CardProps } from 'antd';
import { formatTokenAmount, CountdownState } from '@oyster/common';
import { ArtContent } from '../ArtContent';
import './index.less';
import { AuctionView, useArt, useCreators } from '../../hooks';
import { MetaAvatar } from '../MetaAvatar';
import { AmountLabel } from '../AmountLabel';
import { useHighestBidForAuction } from '../../hooks';

const { Meta } = Card;
export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  let { auctionView } = props;
  const art = useArt(auctionView.thumbnail.metadata.pubkey);
  const category = art?.category;
  const image = art?.image;
  const creators = useCreators(auctionView);
  const name = art?.title || ' ';
  const description = art?.about;
  const [state, setState] = useState<CountdownState>();

  const winningBid = useHighestBidForAuction(auctionView.auction.pubkey);
  const ended =
    state?.hours === 0 && state?.minutes === 0 && state?.seconds === 0;
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
            category={category}
            className="auction-image no-events"
            extension={image}
            uri={image}
            preview={false}
            files={art.files}
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
              {ended ? 'Winning bid' : 'Current bid'}
            </h4>
            <div className="bids">
              <AmountLabel
                style={{ marginBottom: 10 }}
                containerStyle={{ flexDirection: 'row' }}
                title={ended ? 'Winning bid' : 'Highest bid'}
                amount={
                  winningBid &&
                  Number.isFinite(winningBid.info.lastBid?.toNumber())
                    ? formatTokenAmount(winningBid.info.lastBid)
                    : 'No Bid'
                }
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
