import { Col, Divider, Row } from 'antd';
import React, { useMemo } from 'react';
import Masonry from 'react-masonry-css';
import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard/next';
import { CardLoader } from '../../components/MyLoader';
import { useQueryCreatorWithArtworks } from '../../hooks';

export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();

  const variables = useMemo(() => ({ creatorId: id }), [id]);
  const [data, { fetching }] = useQueryCreatorWithArtworks(variables);

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
      {!fetching
        ? data?.artworks.map(art => (
            <Link to={`/art/${art.pubkey}`} key={art.pubkey}>
              <ArtCard art={art} preview={false} />
            </Link>
          ))
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
              {data?.creator.name || data?.creator.address}
            </h2>
            <br />
            <div className="info-header">ABOUT THE CREATOR</div>
            <div className="info-content">{data?.creator.description}</div>
            <br />
            <div className="info-header">Art Created</div>
            {artworkGrid}
          </Col>
        </Row>
      </Col>
    </>
  );
};
