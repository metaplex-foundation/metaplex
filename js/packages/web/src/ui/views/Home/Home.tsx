import React, { FC, useState } from 'react'
import { Hero } from '../../sections/Hero'
import { HottestAuctions } from '../../sections/HottestAuctions'
import { RecentCollections } from '../../sections/RecentCollections'
import { LaunchpadCard } from '../../sections/LaunchpadCard'
import { TrendingCollections } from '../../sections/TrendingCollections'
import { WhyUS } from '../../sections/WhyUS'
import {
  useAhCollectionVolume,
  useAhNFTCollections,
  useNFTCollections,
} from '../../../hooks/useCollections'
import { SetupView } from '../../../views/home/setup'
import { useMeta, useStore } from '@oyster/common'

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

  const { isLoading, store } = useMeta()
  const { isConfigured } = useStore()
  const { liveCollections } = useAhNFTCollections()
  const { collectionVolume } = useAhCollectionVolume()

  const showAuctions = (store && isConfigured) || isLoading

  if (!showAuctions) {
    return (
      <div className='home'>
        <SetupView />
      </div>
    )
  }

  return (
    <div className='home'>
      <Hero className='pt-[80px]' />
      <RecentCollections
        liveCollections={liveCollections as any[]}
        collectionVolume={collectionVolume}
        className='pt-[80px] pb-[40px]'
      />
      <LaunchpadCard />
      <TrendingCollections
        collectionVolume={collectionVolume}
        liveCollections={liveCollections as any[]}
        className='pt-[80px] pb-[80px]'
      />
      <HottestAuctions
        activeKey={activeKey}
        onChangeActiveKey={(key: LiveAuctionViewState) => setActiveKey(key)}
        className='pt-[80px]'
      />
      <WhyUS className='pt-[40px] pb-[120px]' />
    </div>
  )
}
