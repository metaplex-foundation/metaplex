import { Col, Layout } from 'antd';
import React from 'react';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { ArtistCard } from '../../components/ArtistCard';
import { useCreatorNameService, useQueryCreators } from '../../hooks';

const { Content } = Layout;

export const ArtistsView = () => {
  const [{ data }] = useQueryCreators();
  const getArtistInfo = useCreatorNameService();

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
      {data?.map(({ address }: { address: string }) => {
        const artistInfo = getArtistInfo(address);
        return (
          <Link to={`/artists/${address}`} key={address}>
            <ArtistCard
              artist={{
                address,
                ...artistInfo,
              }}
            />
          </Link>
        );
      })}
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
