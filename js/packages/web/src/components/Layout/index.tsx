import { Storefront } from '@oyster/common';
import { Layout, notification } from 'antd';
import React, { ReactNode, useEffect } from 'react';
import { AppBar } from '../AppBar';

const { Content } = Layout;

export const AppLayout = React.memo(function AppLayout(props: {
  children?: ReactNode;
  storefront?: Storefront;
}) {
  useEffect(() => {
    notification.config({
      placement: 'bottomLeft',
      duration: 15,
      maxCount: 3,
    });
  }, []);

  return (
    <>
      <Layout>
        <AppBar logo={props.storefront?.theme?.logo || ''} />
        <Content id="metaplex-layout-content">{props.children}</Content>
      </Layout>
    </>
  );
});
