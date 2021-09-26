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
          {artist.background ? <img src={artist.background} /> : null}
        </div>
      }
      bordered={false}
    >
      <>
        <MetaAvatar creators={[artist]} size={64} />
        <div className="artist-card-name">
          {artist.name || shortenAddress(artist.address || '')}
        </div>
        <div className="artist-card-description">{artist.about}</div>
      </>
    </Card>
  );
};
