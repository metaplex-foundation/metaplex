import React from 'react';
import { Layout } from 'antd';

import './../../App.less';
import './index.less';
import { AppBar } from '../AppBar';
// import useWindowDimensions from '../../utils/layout';

const { Header, Content } = Layout;

export const AppLayout = React.memo((props: any) => {
  // const { width } = useWindowDimensions();

  return (
    <>
      <Layout id={'main-layout'}>
        <span id={'main-bg'}></span>
        <span id={'bg-gradient'}></span>
        <span id={'static-header-gradient'}></span>
        <span id={'static-end-gradient'}></span>
        <Header className="App-Bar">
          <AppBar />
        </Header>
        <Layout id={'width-layout'}>
          <Content
            style={{
              overflow: 'scroll',
              padding: '30px 48px ',
            }}
          >
            {props.children}
          </Content>
        </Layout>
      </Layout>
    </>
  );
});
