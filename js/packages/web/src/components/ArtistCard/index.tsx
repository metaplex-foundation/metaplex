import React, { FC } from 'react';
import { Card } from 'antd';

import { shortenAddress } from '@oyster/common';
import { MetaAvatar } from '../MetaAvatar';
import { Artist } from '../../graphql';

export const ArtistCard: FC<{ artist: Artist }> = ({ artist }) => {
  return (
    <Card
      hoverable={true}
      className={`artist-card`}
      cover={<div style={{ height: 100 }} />}
    >
      <div>
        <MetaAvatar creators={[artist as any]} size={100} />
        <div className="artist-card-name">
          {artist.name || shortenAddress(artist.address || '')}
        </div>
        <div className="artist-card-description">{artist.about}</div>
      </div>
    </Card>
  );
};
