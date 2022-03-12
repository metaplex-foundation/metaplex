import React, { FC } from 'react'
import CN from 'classnames'
import { Hero } from '../../sections/Hero'
import { HottestsAuctions } from '../../sections/HottestsAuctions'
import { RecentCollections } from '../../sections/RecentCollections'
import { LaunchpadCard } from '../../sections/LaunchpadCard'
import { TrendingCollections } from '../../sections/TrendingCollections'
import { WhyUS } from '../../sections/WhyUS'

export interface HomeProps {
  [x: string]: any
}

export const Home: FC<HomeProps> = ({ className, ...restProps }: HomeProps) => {
  const HomeClasses = CN(`home`, className)

  return (
    <div className={HomeClasses} {...restProps}>
      <Hero className='pt-[80px]' />
      <HottestsAuctions className='pt-[80px]' />
      <RecentCollections className='pt-[80px] pb-[40px]' />
      <LaunchpadCard />
      <TrendingCollections className='pt-[80px] pb-[80px]' />
      <WhyUS className='pt-[40px] pb-[120px]' />
    </div>
  )
}

export default Home
