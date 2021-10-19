import { Col, Divider, Row } from 'antd';
import React from 'react';
import Masonry from 'react-masonry-css';
import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { CardLoader } from '../../components/MyLoader';
import { useCreator, useCreatorArts } from '../../hooks';

export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();
  const creator = useCreator(id);
  const { artwork, isLoading } = useCreatorArts(id);
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const artworkGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? artwork.map((m, idx) => {
            const id = m.pubkey;
            return (
              <Link to={`/art/${id}`} key={idx}>
                <ArtCard key={id} pubkey={m.pubkey} preview={false} />
              </Link>
            );
          })
        : [...Array(6)].map((_, idx) => <CardLoader key={idx} />)}
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
            <h2 style={{ color: 'white', width: '82%', margin: '0 auto' }}>
              {/* <MetaAvatar creators={creator ? [creator] : []} size={100} /> */}
              {creator?.info.name || creator?.info.address}
            </h2>
            <br />
            <div
              className="info-header"
              style={{ width: '82%', margin: '0 auto' }}
            >
              ABOUT THE CREATOR
            </div>
            <div
              className="info-content"
              style={{ width: '82%', margin: '0 auto' }}
            >
              {creator?.info.description}
            </div>
            <br />
            <div
              className="info-header"
              style={{ width: '82%', margin: '0 auto' }}
            >
              Art Created
            </div>
            {artworkGrid}
          </Col>
        </Row>
      </Col>
    </>
  );
};
