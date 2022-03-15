import React, { FC, useState } from 'react'
import { Hero } from '../../sections/Hero'
import { HottestAuctions } from '../../sections/HottestAuctions'
import { RecentCollections } from '../../sections/RecentCollections'
import { LaunchpadCard } from '../../sections/LaunchpadCard'
import { TrendingCollections } from '../../sections/TrendingCollections'
import { WhyUS } from '../../sections/WhyUS'

export interface HomeProps {
  [x: string]: any
}

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
  Own = '4',
}

export const Home: FC<HomeProps> = () => {
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All)

  return (
    <div className='home'>
      <Hero className='pt-[80px]' />
      <HottestAuctions
        activeKey={activeKey}
        onChangeActiveKey={(key: LiveAuctionViewState) => setActiveKey(key)}
        className='pt-[80px]'
      />
      <RecentCollections className='pt-[80px] pb-[40px]' />
      <LaunchpadCard />
      <TrendingCollections className='pt-[80px] pb-[80px]' />
      <WhyUS className='pt-[40px] pb-[120px]' />
    </div>
  )
}
