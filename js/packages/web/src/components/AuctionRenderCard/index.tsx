import React from 'react';
import { Card, CardProps } from 'antd';
import { ArtContent } from '../ArtContent';
import { AuctionView, useArt, useCreators } from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { MetaAvatar } from '../MetaAvatar';
import { AuctionCountdown } from '../AuctionNumbers';

import { useAuctionStatus } from './hooks/useAuctionStatus';
import { useTokenList } from '../../contexts/tokenList';

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const creators = useCreators(auctionView);
  const name = art?.title || ' ';

  const tokenInfo = useTokenList().mainnetTokens.filter(m=>m.address == auctionView.auction.info.tokenMint)[0]
  const { status, amount , temp} = useAuctionStatus(auctionView);
  function getArtistName()
  {
   return temp;
  
    if(creators[0]?.address=="4ZMAfu75f4RAHCy8M6f4Kx3GaiMbBfBgmTV34cKSK22P")
    return "Galactic Geckos";
   
   return (creators[0]?.name ||
   creators[0]?.address ||
   'My NFT SPACE')
  
  }

  const card = (
    <Card hoverable={true} className={`auction-render-card`} bordered={false}>
      <div className={'card-art-info'}>
        <div className="auction-gray-wrapper">
          <div className={'card-artist-info'}>
          
            <span className={'artist-name'}>
            {getArtistName()}
          
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
          
        </div>
      </div>
      <div className="card-bid-info">
        <span className={'text-uppercase info-message'}>{status}</span>
        <AmountLabel
          containerStyle={{ flexDirection: 'row' }}
          title={status}
          amount={amount}
          iconSize={24}
          tokenInfo={tokenInfo}
        />
      </div>
    </Card>
  );

  return card;
};
