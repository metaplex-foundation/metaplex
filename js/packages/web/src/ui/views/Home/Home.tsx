import React, { FC, useState } from 'react'
import { Hero } from '../../sections/Hero'
import { HottestAuctions } from '../../sections/HottestAuctions'
import { RecentCollections } from '../../sections/RecentCollections'
import { LaunchpadCard } from '../../sections/LaunchpadCard'
import { TrendingCollections } from '../../sections/TrendingCollections'
import { WhyUS } from '../../sections/WhyUS'
import { useCollections } from '../../../hooks/useCollections'

export interface HomeProps {}

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
  Own = '4',
}

export const Home: FC<HomeProps> = () => {
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All)
  const { liveCollections } = useCollections()
  return (
    <div className='home'>
      <Hero className='pt-[80px]' />
      <HottestAuctions
        activeKey={activeKey}
        onChangeActiveKey={(key: LiveAuctionViewState) => setActiveKey(key)}
        className='pt-[80px]'
      />
      <RecentCollections liveCollections={liveCollections} className='pt-[80px] pb-[40px]' />
      <LaunchpadCard />
      <TrendingCollections liveCollections={liveCollections} className='pt-[80px] pb-[80px]' />
      <WhyUS className='pt-[40px] pb-[120px]' />
    </div>
  )
}
