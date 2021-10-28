import { Col, Divider, Row } from 'antd';
import React, { useEffect, useState } from 'react';
import Masonry from 'react-masonry-css';
import { Spin } from 'antd'
import { loadMetadataForCreator, useConnection, useMeta } from '@oyster/common';
import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { useCreator, useCreatorArts } from '../../hooks';
import { LoadingOutlined } from '@ant-design/icons';
import { ArtistCard } from '../../components/ArtistCard';


export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();
  const { whitelistedCreatorsByCreator, patchState } = useMeta()
  const [loadingArt, setLoadingArt] = useState(true)
  const artwork = useCreatorArts(id);
  const connection = useConnection();
  const creators = Object.values(whitelistedCreatorsByCreator);
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  useEffect(() => {
    if (!id) {
      return;
    }

    (async () => {
      setLoadingArt(true);
      const artistMetadataState = await loadMetadataForCreator(connection, whitelistedCreatorsByCreator[id]);

      patchState(artistMetadataState);
      setLoadingArt(false);
    })()
  }, [connection, id])

  return (
    <Row>
      <Col span={24}>
        <h2>Artists</h2>
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
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
        </Masonry>
      </Col>
      <Col span={24}>
        <Divider />
        {loadingArt ? (
          <div className="app-section--loading">
            <Spin indicator={<LoadingOutlined />} />
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {artwork.map((m, idx) => {
              const id = m.pubkey;
              return (
                <Link to={`/artworks/${id}`} key={idx}>
                  <ArtCard key={id} pubkey={m.pubkey} preview={false} />
                </Link>
              );
            })
            }
          </Masonry>
        )}
      </Col>
    </Row>
  );
};
