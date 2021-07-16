import React from 'react';
import { Layout } from 'antd';

import './../../App.less';
import './index.less';
import { LABELS } from '../../constants';
import { AppBar } from '../AppBar';
// import useWindowDimensions from '../../utils/layout';

const { Header, Content } = Layout;


export const AppLayout = React.memo((props: any) => {
  // const { width } = useWindowDimensions();

  return (
    <>
      <Layout id={'main-layout'}>
        <div id={'main-bg'}></div>
        <Header className="App-Bar">
          <AppBar />
        </Header>
        <Content style={{
          overflow: "scroll",
          padding: "30px 2vw",
        }}>
          {props.children}
        </Content>
      </Layout>
    </>
  );
});
