import React, { useState } from 'react'
import { Card } from 'antd'

import { Artist } from '../../types'

import './index.less'
import { shortenAddress } from '@oyster/common'
import { MetaAvatar } from '../MetaAvatar';

export const ArtistCard = ({artist}: {artist: Artist}) => {

  return (
    <Card
      hoverable={true}
      className={`artist-card`}
      cover={<div style={{ height: 220 }} />}
    >
      <div>
        <MetaAvatar creators={[artist]} size={32} />
        <div className="artist-card-name">{artist.name || shortenAddress(artist.address || '')}</div>
        <div className="artist-card-description">{artist.about}</div>
      </div>
    </Card>
  )
}
