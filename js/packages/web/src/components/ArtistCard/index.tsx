import React from 'react';
import { Card } from 'antd';

import { Artist } from '../../types';

import { shortenAddress } from '@oyster/common';
import { MetaAvatar } from '../MetaAvatar';

export const ArtistCard = ({ artist }: { artist: Artist }) => {
  return (
    <Card
      hoverable={true}
      className={`artist-card`}
      cover={
        <div className="header-container">
          <img src="/diamond.jpg" /> 
        </div>
      }
      bordered={false}
    >
      <>
        
        <div className="artist-card-name">
          My NFT Space
        </div>
        <div className="artist-card-description">{artist.about}</div>
      </>
    </Card>
  );
};
