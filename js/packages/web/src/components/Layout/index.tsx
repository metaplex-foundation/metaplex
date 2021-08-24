import React, { useState } from 'react';
import { Layout } from 'antd';

import { LABELS } from '../../constants';
import { AppBar } from '../AppBar';
import useWindowDimensions from '../../utils/layout';
import { Link } from 'react-router-dom';

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
      <Header style={{
        position: width > 768 ? 'fixed' : 'relative',
        zIndex:10,
        boxShadow: 'rgba(0, 0, 0, 0.2) 0px 5px 10px 1px'
      }} className="App-Bar">
        <AppBar menuOut={menuOut} setMenuOut={setMenuOut}  />
      </Header>
      <Layout title={LABELS.APP_TITLE} style={{
        padding: paddingForLayout(width),
        maxWidth: 1000,
        marginTop:  width > 768 ? 50 : 16
        
      }}>
        <Content style={{ overflow: 'scroll', paddingBottom: 50 }}>
          {props.children}
        </Content>
      </Layout>

      <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 256,
          backgroundColor: '#0a8000',
          zIndex: 5,
          transform: `translateX(${menuOut ? '0' : '-100%'})`,
          transition: '0.2s transform ease',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
            <div style={{margin: '120px 2rem', display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gridGap: '1rem'}}>
              <Link style={{color: 'white'}} onClick={() => setMenuOut(false)} to="/">Home </Link> 
              <Link style={{color: 'white'}} onClick={() => setMenuOut(false)} to="/treehouse">Treehouse </Link> 
              <Link style={{color: 'white'}} onClick={() => setMenuOut(false)} to="/roadmap">Roadmap </Link> 
              <Link style={{color: 'white'}} onClick={() => setMenuOut(false)} to="/about">About </Link> 
            </div>
        </div>
    </>
  );
});
