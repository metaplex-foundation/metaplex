import { Col, Divider, Row } from 'antd';
import React, { useEffect, useState } from 'react';
import Masonry from 'react-masonry-css';
import { Spin } from 'antd'
import { loadMetadataForCreator, useConnection, useMeta } from '@oyster/common';
import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { useCreator, useCreatorArts } from '../../hooks';
import { LoadingOutlined } from '@ant-design/icons';

export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();
  const { whitelistedCreatorsByCreator, patchState } = useMeta()
  const [loadingArt, setLoadingArt] = useState(true)
  const creator = useCreator(id);
  const artwork = useCreatorArts(id);
  const connection = useConnection();
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
      const artistMetadataState = await loadMetadataForCreator(connection, whitelistedCreatorsByCreator[id]);

      patchState(artistMetadataState);
      setLoadingArt(false);
    })()
  }, [connection, id])

  const artworkGrid = (
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
  );

  return (
    <>
      <Col>
        <Divider />
        <Row
          style={{ margin: '0 30px', textAlign: 'left', fontSize: '1.4rem' }}
        >
          <Col span={24}>
            <h2>
              {/* <MetaAvatar creators={creator ? [creator] : []} size={100} /> */}
              {creator?.info.name || creator?.info.address}
            </h2>
            <br />
            <div className="info-header">ABOUT THE CREATOR</div>
            <div className="info-content">{creator?.info.description}</div>
            <br />
            {loadingArt ? (
              <div className="app-section--loading">
                <Spin indicator={<LoadingOutlined />} />
              </div>
            ) : (
              <>
                <div className="info-header">Art Created</div>
                {artworkGrid}
              </>
            )}
          </Col>
        </Row>
      </Col >
    </>
  );
};
