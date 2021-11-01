import { Col, Divider, Row } from 'antd';
import React, { useEffect, useState } from 'react';
import { Spin } from 'antd'
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
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
    <MetaplexMasonry>
      {artwork.length > 0
        ? artwork.map((m, idx) => {
            const id = m.pubkey;
            return (
              <Link to={`/art/${id}`} key={idx}>
                <ArtCard key={id} pubkey={m.pubkey} preview={false} />
              </Link>
            );
          })
        : []}
    </MetaplexMasonry>
  );

  return (
    <>
      <Col>
        <Divider />
        <Row>
          <Col span={24}>
            <h2>
              {creator?.info.name || creator?.info.address}
            </h2>
            <br />
            <div>ABOUT THE CREATOR</div>
            <div>{creator?.info.description}</div>
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
