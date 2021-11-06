import { LoadingOutlined } from '@ant-design/icons';
import { loadMetadataForCreator, useConnection, useMeta } from '@oyster/common';
import { Col, Divider, Row, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { ArtistCard } from '../../components/ArtistCard';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useCreatorArts } from '../../hooks';

export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();
  const { whitelistedCreatorsByCreator, patchState } = useMeta();
  const [loadingArt, setLoadingArt] = useState(true);
  const artwork = useCreatorArts(id);
  const connection = useConnection();
  const creators = Object.values(whitelistedCreatorsByCreator);

  useEffect(() => {
    if (!id) {
      return;
    }

    (async () => {
      setLoadingArt(true);
      const creator = whitelistedCreatorsByCreator[id];

      const artistMetadataState = await loadMetadataForCreator(
        connection,
        creator,
      );

      patchState(artistMetadataState);
      setLoadingArt(false);
    })();
  }, [connection, id]);

  return (
    <Row>
      <Col span={24}>
        <h2>Artists</h2>
        <MetaplexMasonry>
          {creators.map((m, idx) => {
            const address = m.info.address;
            return (
              <Link to={`/artists/${address}`} key={idx}>
                <ArtistCard
                  key={address}
                  active={address === id}
                  artist={{
                    address,
                    name: m.info.name || '',
                    image: m.info.image || '',
                    link: m.info.twitter || '',
                  }}
                />
              </Link>
            );
          })}
        </MetaplexMasonry>
      </Col>
      <Col span={24}>
        <Divider />
        {loadingArt ? (
          <div className="app-section--loading">
            <Spin indicator={<LoadingOutlined />} />
          </div>
        ) : (
          <MetaplexMasonry>
            {artwork.map((m, idx) => {
              const id = m.pubkey;
              return (
                <Link to={`/artworks/${id}`} key={idx}>
                  <ArtCard key={id} pubkey={m.pubkey} preview={false} />
                </Link>
              );
            })}
          </MetaplexMasonry>
        )}
      </Col>
    </Row>
  );
};
