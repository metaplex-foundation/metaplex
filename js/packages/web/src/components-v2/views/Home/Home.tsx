import React, { FC, useState } from 'react'
import { Hero } from '../../sections/Hero'
import { CallToAction } from '../../sections/CallToAction'
import { Features } from '../../sections/Features'
import { MostActive } from '../../sections/MostActive'
import { SubmitCollection } from '../../sections/SubmitCollection'
import { BlogCarousel } from '../../sections/BlogCarousel'
import { RecentCollectionsCarousel } from '../../sections/RecentCollectionsCarousel'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'
import { useConnection, useMeta } from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'

export interface HomeProps {
  [x: string]: any
}

export const Home: FC<HomeProps> = () => {
  // const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All)
  // // const { isLoading } = useMeta()
  // const context = useMeta()
  // const { connected } = useWallet()
  // const { auctions } = useAuctionsList()
  // console.log(auctions)

  return (
    <>
      <Hero className='mb-[0px] md:mb-[60px] lg:mb-[100px]' />
      <CallToAction className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      {/* <RecentCollectionsCarousel className='mb-[40px] md:mb-[60px] lg:mb-[100px]' /> */}
      <Features className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      <MostActive className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      <BlogCarousel className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
      <SubmitCollection className='mb-[40px] md:mb-[60px] lg:mb-[100px]' />
    </>
  )
}

export default Home
