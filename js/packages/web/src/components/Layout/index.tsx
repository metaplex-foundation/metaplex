import React, { useContext, useEffect } from 'react';
import { Layout } from 'antd';
import { contexts } from '@oyster/common';

import './../../App.less';
import './index.less';
import { LABELS } from '../../constants';
import { AppBar } from '../AppBar';
import useWindowDimensions from '../../utils/layout';

const { StorefrontContext } = contexts.Storefront;
const { Header, Content } = Layout;

const paddingForLayout = (width: number) => {
  if (width <= 768) return '5px 10px';
  if (width > 768) return '10px 30px';
};

export const AppLayout = React.memo((props: any) => {
  const { width } = useWindowDimensions();
  const { storefront } = useContext(StorefrontContext);

  useEffect(() => {
    if(!storefront) {
      return
    }

    var head = document.head;
    var link = document.createElement("link");

    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = storefront.themeUrl;

    head.appendChild(link);

    return () => { head.removeChild(link); }

  }, [storefront]);

  return (
    <>
      <Layout
        title={LABELS.APP_TITLE}
        style={{
          padding: paddingForLayout(width),
          maxWidth: 1000,
        }}
      >
        <Header className="App-Bar">
          <AppBar />
        </Header>
        <Content style={{ overflow: 'scroll', paddingBottom: 50 }}>
          {props.children}
        </Content>
      </Layout>
    </>
  );
});
