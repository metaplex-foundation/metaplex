import React, { FC } from 'react'
import { HeroV2 } from '../../sections/HeroV2'
import { CallToAction } from '../../sections/CallToAction'
import { Features } from '../../sections/Features'
import { MostActive } from '../../sections/MostActive'
import { SubmitCollection } from '../../sections/SubmitCollection'
import { BlogCarousel } from '../../sections/BlogCarousel'
import { RecentCollectionsCarousel } from '../../sections/RecentCollectionsCarousel'
import { TrendingCollectionsCarousel } from '../../sections/TrendingCollectionsCarousel'

export interface HomeProps {
  [x: string]: any
}

export const Home: FC<HomeProps> = () => {
  return (
    <>
      <HeroV2 className='mb-[0px] md:mb-[60px] lg:mb-[100px]' />
      <TrendingCollectionsCarousel className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      <CallToAction className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      <RecentCollectionsCarousel className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      <Features className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      {/* <MostActive className='mb-[40px] md:mb-[60px] lg:mb-[100px]' /> */}
      <BlogCarousel className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      <SubmitCollection className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
    </>
  )
}

export default Home
