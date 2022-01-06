import { Storefront } from '@oyster/common';
import { Layout, notification } from 'antd';
import React, { ReactNode, useEffect } from 'react';
import { Banner } from './../../components/Banner';
import { useStore } from '@oyster/common';
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

  const { storefront } = useStore();

  return (
    <div className="app-wrapper">
      <AppBar />
      <Banner
        src={storefront.theme.banner}
        headingText={storefront.meta.title}
        subHeadingText={storefront.meta.description}
        logo={props.storefront?.theme?.logo || ''}
        twitterVerification={storefront.integrations?.twitterVerification}
      />
      <Content id="metaplex-layout-content">{props.children}</Content>
    </div>
  );
});
