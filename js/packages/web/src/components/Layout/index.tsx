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
        <Layout id={'width-layout'}>
          <Header className="App-Bar">
            <AppBar />
          </Header>
          <Content
            style={{
              overflow: 'scroll',
              padding: '30px 2vw',
            }}
          >
            {props.children}
          </Content>
        </Layout>
      </Layout>
    </>
  );
});
