import React from 'react';
import type { NextPage } from 'next';

import { Header } from '../components-v2/sections/Header';
import { Hero } from '../components-v2/sections/Hero';
import { CallToAction } from '../components-v2/molecules/CallToAction';

const Home: NextPage = () => {
  return (
    <>
      <Header />
      <Hero className="mb-[116px]" />
      <CallToAction className="mb-[116px]" />
    </>
  );
};

export default Home;
