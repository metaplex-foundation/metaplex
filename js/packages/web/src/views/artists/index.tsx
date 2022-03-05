import { Layout } from 'antd';
import React from 'react';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { ArtistCard } from '../../components/ArtistCard';
import { useMeta } from '../../contexts';

const { Content } = Layout;

export const ArtistsView = () => {
  const { whitelistedCreatorsByCreator } = useMeta();

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };
  const items = Object.values(whitelistedCreatorsByCreator);
  const artistGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid artists-masonry"
      columnClassName="my-masonry-grid_column"
    >
      {items.map((m, idx) => {
        const id = m.info.address;
        return (
          <Link to={`/artists/${id}`} key={idx}>
            <ArtistCard
              key={id}
              artist={{
                address: m.info.address,
                name: m.info.name || '',
                image: m.info.image || '',
                link: m.info.twitter || '',
                background: m.info.background || '',
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
        {artistGrid}
      </Content>
    </Layout>
  );
};
