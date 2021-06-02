import React, { useState } from 'react';
import { ArtCard } from '../../components/ArtCard';
import { Layout, Row, Col, Tabs } from 'antd';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { useUserArts } from '../../hooks';
import { useMeta } from '../../contexts';
import { ArtistCard } from '../../components/ArtistCard';

const { TabPane } = Tabs;

const { Content } = Layout;

export const ArtistsView = () => {
  const ownedMetadata = useUserArts();
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
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {items.map((m, idx) => {
        const id = m.info.address.toBase58();
        return (
          <Link to={`/artists/${id}`} key={idx}>
            <ArtistCard key={id} artist={{
              address: m.info.address.toBase58(),
              name: m.info.name || '',
              image: m.info.image || '',
              link: m.info.twitter || ''
            }} />
          </Link>
        );
      })}
    </Masonry>
  );

  return (
    <Layout style={{ margin: 0, marginTop: 30 }}>
      <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col style={{ width: '100%', marginTop: 10 }}>
          {artistGrid}
        </Col>
      </Content>
    </Layout>
  );
};
