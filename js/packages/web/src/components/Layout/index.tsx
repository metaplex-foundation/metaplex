import { Storefront } from '@oyster/common';
import { Layout } from 'antd';
import React, { ReactNode } from 'react';
import { AppBar } from '../AppBar';

const { Header, Content } = Layout;

export const AppLayout = React.memo(function AppLayout(props: {
  children?: ReactNode;
  storefront?: Storefront;
}) {
  return (
    <>
      <Layout>
        <Header>
          <AppBar logo={props.storefront?.theme?.logo || ''} />
        </Header>
        <Content id="metaplex-layout-content">{props.children}</Content>
      </Layout>
    </>
  );
});
