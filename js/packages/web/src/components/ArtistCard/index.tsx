import React from 'react';
import { Card, Row, Col } from 'antd';

import { Artist } from '../../types';

import { shortenAddress } from '@oyster/common';
import { MetaAvatar } from '../MetaAvatar';

export const ArtistCard = ({
  artist,
}: /* active, */
{
  artist: Artist;
  active: boolean;
}) => {
  return (
    <Card
      hoverable
      cover={
        <div className="metaplex-artist-card-cover">
          {artist.background ? (
            <img
              className="metaplex-artist-card-background"
              src={artist.background}
            />
          ) : null}
        </div>
      }
      bordered={false}
    >
      <Row align="middle">
        <Col flex="0 0 auto">
          <MetaAvatar creators={[artist]} size={64} />
        </Col>
        <Col flex="0 0 32px" />
        <Col flex="1 0 0">
          <h4>{artist.name || shortenAddress(artist.address || '')}</h4>
          {artist.about && <div>{artist.about}</div>}
        </Col>
      </Row>
    </Card>
  );
};
