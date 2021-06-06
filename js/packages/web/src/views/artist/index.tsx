import React from 'react';
import { Row, Col, Divider, Layout, Tag, Badge } from 'antd';
import { useParams } from 'react-router-dom';
import { useCreator } from '../../hooks';
import Masonry from 'react-masonry-css';
import { ArtCard } from '../../components/ArtCard';
import { useCreatorArts } from '../../hooks';
import { Link } from 'react-router-dom';
import { CardLoader } from '../../components/MyLoader';
import { MetaAvatar } from '../../components/MetaAvatar';

export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();
  const creator = useCreator(id);
  const artwork = useCreatorArts(id);
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
      {artwork.length > 0
        ? artwork.map((m, idx) => {
            const id = m.pubkey.toBase58();
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
            <h2>
              {/* <MetaAvatar creators={creator ? [creator] : []} size={100} /> */}
              {creator?.info.name || creator?.info.address.toBase58()}
            </h2>
            <br />
            <div className="info-header">ABOUT THE CREATOR</div>
            <div className="info-content">{creator?.info.description}</div>
            <br />
            <div className="info-header">Art Created</div>
            {artworkGrid}
          </Col>
        </Row>
      </Col>
    </>
  );
};
