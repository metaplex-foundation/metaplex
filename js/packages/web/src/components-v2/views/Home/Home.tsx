import React, { FC } from 'react';
import { Hero } from '../../sections/Hero';
import { CallToAction } from '../../sections/CallToAction';
import { Features } from '../../sections/Features';
import { MostActive } from '../../sections/MostActive';
import { SubmitCollection } from '../../sections/SubmitCollection';
import { BlogCarousel } from '../../sections/BlogCarousel';
import { RecentCollectionsCarousel } from '../../sections/RecentCollectionsCarousel';

export interface HomeProps {
  [x: string]: any;
}

export const Home: FC<HomeProps> = () => {
  return (
    <>
      <Hero className="mb-[140px]" />
      <CallToAction className="mb-[140px]" />
      <RecentCollectionsCarousel className="mb-[140px]" />
      <Features className="mb-[140px]" />
      <MostActive className="mb-[140px]" />
      <BlogCarousel className="mb-[140px]" />
      <SubmitCollection className="mb-[140px]" />
    </>
  );
};

export default Home;
