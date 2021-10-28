import React, { useState } from 'react';
import { Card } from 'antd';
import { useParams } from 'react-router';
import cx from 'classnames';

import { Artist } from '../../types';

import { shortenAddress } from '@oyster/common';
import { MetaAvatar } from '../MetaAvatar';

export const ArtistCard = ({ artist, active }: { artist: Artist, active: boolean }) => {
  return (
    <Card
      className={cx("artist-card", { "active": active })}
      cover={<div style={{ height: 100 }} />}
    >
      <div>
        <MetaAvatar creators={[artist]} size={100} />
        <div className="artist-card-name">
          {artist.name || shortenAddress(artist.address || '')}
        </div>
        <div className="artist-card-description">{artist.about}</div>
      </div>
    </Card>
  );
};
