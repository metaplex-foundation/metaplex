import React from 'react';
import { Layout } from 'antd';
import { StaticPage } from '../../components/StaticPage';
import { data } from './staticData';

export const StaticPageView = () => {
  return (
    <Layout style={{ margin: 0, alignItems: 'center' }}>
      <StaticPage
        leftContent={data.leftContent}
        headContent={data.headContent}
        midContent={data.midContent}
        bottomContent={data.bottomContent}
      />
    </Layout>
  );
};
