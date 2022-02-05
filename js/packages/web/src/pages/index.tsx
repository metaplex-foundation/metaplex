import React from 'react';
import type { NextPage } from 'next';

import { Header } from '../components-v2/sections/Header';
import { Hero } from '../components-v2/sections/Hero';
import { CallToAction } from '../components-v2/sections/CallToAction';
import { Features } from '../components-v2/sections/Features';
import { MostActive } from '../components-v2/sections/MostActive';
import { SubmitCollection } from '../components-v2/sections/SubmitCollection';
import { BlogCarousel } from '../components-v2/sections/BlogCarousel';
import { RecentCollectionsCarousel } from '../components-v2/sections/RecentCollectionsCarousel';
import { Footer } from '../components-v2/sections/Footer';

const Home: NextPage = () => {
  return (
    <>
      <Header />
      <div className="pt-[85px]">
        <Hero className="mb-[140px]" />
        <CallToAction className="mb-[140px]" />
        <RecentCollectionsCarousel className="mb-[140px]" />
        <Features className="mb-[140px]" />
        <MostActive className="mb-[140px]" />
        <BlogCarousel className="mb-[140px]" />
        <SubmitCollection className="mb-[140px]" />
      </div>
      <Footer />
    </>
  );
};

export default Home;
