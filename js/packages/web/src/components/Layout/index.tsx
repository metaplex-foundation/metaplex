import { Storefront } from '@oyster/common';
import { Layout, notification } from 'antd';
import React, { ReactNode, useEffect } from 'react';
import { Banner } from './../../components/Banner';
import { useStore } from '@oyster/common';

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
      <Banner
        src={storefront.theme.banner}
        headingText={storefront.meta.title}
        subHeadingText={storefront.meta.description}
        logo={props.storefront?.theme?.logo || ''}
      />
      <Content id="metaplex-layout-content">{props.children}</Content>
    </div>
  );
});
