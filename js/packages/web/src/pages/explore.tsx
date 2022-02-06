import React from 'react';
import type { NextPage } from 'next';

import { Header } from '../components-v2/sections/Header';
import { Footer } from '../components-v2/sections/Footer';
import { ExploreCollections } from '../components-v2/sections/ExploreCollections';

const Explore: NextPage = () => {
  return (
    <>
      <Header />
      <div className="pt-[85px]">
        <ExploreCollections />
      </div>
      <Footer />
    </>
  );
};

export default Explore;
