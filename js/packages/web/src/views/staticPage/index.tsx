import React from 'react';
import { Layout } from 'antd';
import { StaticPage } from '../../components/StaticPage';
import { example1 } from './testData';

export const StaticPageView = () => {
  return (
    <Layout style={{ margin: 0, alignItems: 'center' }}>
      <StaticPage
        leftContent={example1.leftContent}
        headContent={example1.headContent}
        midContent={example1.midContent}
        bottomContent={example1.bottomContent}
      />
    </Layout>
  );
};
