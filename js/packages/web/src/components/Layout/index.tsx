import React, { useEffect, useState } from 'react';
import { Layout } from 'antd';

import { LABELS } from '../../constants';
import { AppBar } from '../AppBar';
import useWindowDimensions from '../../utils/layout';
import { SideMenu } from '../side-menu/side-menu';
const { Header, Content } = Layout;

const paddingForLayout = (width: number) => {
  if (width <= 768) return '5px 10px';
  if (width > 768) return '10px 30px';
};
export const AppLayout = React.memo((props: any) => {
  const { width } = useWindowDimensions();
  const [menuOut, setMenuOut] = useState(false);

  return (
    <>
      <Header
        style={{
          position: 'fixed',
          zIndex: 10,
          boxShadow: 'rgba(0, 0, 0, 0.2) 0px 5px 10px 1px',
        }}
        className="App-Bar"
      >
        <AppBar menuOut={menuOut} setMenuOut={setMenuOut} />
      </Header>
      <Layout
        title={LABELS.APP_TITLE}
        style={{
          padding: paddingForLayout(width),
          maxWidth: 1000,
          marginTop: 72,
        }}
      >
          
        <Content onClick={() => setMenuOut(false)} style={{ overflow: 'scroll', paddingBottom: 50 }}>
          {props.children}
        </Content>
      </Layout>

      {width < 768 && (
        <SideMenu menuOut={menuOut} setMenuOut={setMenuOut} width={256}  />
      )}
    </>
  );
});
