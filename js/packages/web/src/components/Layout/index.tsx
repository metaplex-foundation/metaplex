import React, { ReactNode } from 'react';
import { Layout } from 'antd';

import { AppBar } from '../AppBar';

const { Header, Content } = Layout;

export const AppLayout = React.memo((props: { children?: ReactNode }) => {
  return (
    <>
      <Layout>
        <Header>
          <AppBar />
        </Header>
        <Content id="metaplex-layout-content">{props.children}</Content>
      </Layout>
    </>
  );
});
