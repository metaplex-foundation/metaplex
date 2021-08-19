import { Col, Layout } from 'antd';
import React from 'react';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { ArtistCard } from '../../components/ArtistCard';
import { useQueryCreators } from '../../hooks';

const { Content } = Layout;

export const ArtistsView = () => {
  const [data] = useQueryCreators();

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const artistGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {data?.creators.map(creator => (
        <Link to={`/artists/${creator.address}`} key={creator.address}>
          <ArtistCard artist={creator} />
        </Link>
      ))}
    </Masonry>
  );

  return (
    <Layout style={{ margin: 0, marginTop: 30 }}>
      <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col style={{ width: '100%', marginTop: 10 }}>{artistGrid}</Col>
      </Content>
    </Layout>
  );
};
