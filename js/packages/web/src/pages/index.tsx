import React from 'react';
import type { NextPage } from 'next';

import { Header } from '../components-v2/sections/Header';
import { Hero } from '../components-v2/sections/Hero';

const Home: NextPage = () => {
  return (
    <>
      <Header />
      <Hero />
    </>
  );
};

export default Home;
