import React from 'react';

import { Header } from '../../components-v2/sections/Header';
import { Footer } from '../../components-v2/sections/Footer';
// import { AppBar } from '../AppBar';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { Footer } from '../Footer';

// const { Header, Content } = Layout;

export const AppLayout = React.memo(function AppLayoutImpl(props: any) {
  const { children } = props;
  return (
    <>
      {/* <AppBar/> */}
      <Header />
      <div className="wrapper pt-[60px]">{children}</div>
      <Footer />
    </>
  );
});
