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
      <Layout
        id={'main-layout'}
        title={LABELS.APP_TITLE}
      >
        <span id={'main-bg'}></span>
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
