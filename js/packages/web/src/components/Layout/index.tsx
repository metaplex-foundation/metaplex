import React from 'react';

import { Header } from '../../components-v2/sections/Header';
import { Footer } from '../../components-v2/sections/Footer';

export const AppLayout = React.memo((props: any) => {
  const { children } = props;

  return (
    <>
      <Header />
      <div className="wrapper pt-[60px]">{children}</div>
      <Footer />
    </>
  );
});
