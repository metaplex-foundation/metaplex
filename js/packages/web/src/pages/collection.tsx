import React from 'react';
import type { NextPage } from 'next';

import { Header } from '../components-v2/sections/Header';
import { Footer } from '../components-v2/sections/Footer';
import { CollectionHeader } from '../components-v2/sections/CollectionHeader';
import { CollectionBody } from '../components-v2/sections/CollectionBody';

const Collection: NextPage = () => {
  return (
    <>
      <Header />
      <div className="pt-[85px]">
        <CollectionHeader />
        <CollectionBody className="pt-[60px] pb-[100px]" />
      </div>
      <Footer />
    </>
  );
};

export default Collection;
