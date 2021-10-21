import { Col, Divider, Row } from 'antd';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useCreator, useCreatorArts } from '../../hooks';

export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();
  const creator = useCreator(id);
  const artwork = useCreatorArts(id);

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
              {/* <MetaAvatar creators={creator ? [creator] : []} size={100} /> */}
              {creator?.info.name || creator?.info.address}
            </h2>
            <br />
            <div>ABOUT THE CREATOR</div>
            <div>{creator?.info.description}</div>
            <br />
            <div>Art Created</div>
            {artworkGrid}
          </Col>
        </Row>
      </Col>
    </>
  );
};
