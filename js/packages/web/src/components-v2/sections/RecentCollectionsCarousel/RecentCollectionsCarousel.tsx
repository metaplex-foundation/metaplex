import React, { useEffect, useState, FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useUserAccounts } from '@oyster/common'

import { BlockCarousel } from '../../molecules/BlockCarousel'
import { NftCard } from '../../molecules/NftCard'
import { ArtworkViewState } from '../../../views/artworks/types'
import { useItems } from '../../../views/artworks/hooks/useItems'

import { useViewport } from '../../../utils/useViewport'
import { useMeta } from '../../../contexts'

export interface RecentCollectionsCarouselProps {
  [x: string]: any
}

export const RecentCollectionsCarousel: FC<RecentCollectionsCarouselProps> = ({
  className,
  ...restProps
}: RecentCollectionsCarouselProps) => {
  const { isMobile } = useViewport()
  const RecentCollectionsCarouselClasses = CN(`recent-collections-carousel`, className)

  const { connected } = useWallet()
  const { pullItemsPage, isFetching } = useMeta()
  const { userAccounts } = useUserAccounts()
  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex)
  const userItems = useItems({ activeKey })

  useEffect(() => {
    if (!isFetching) {
      pullItemsPage(userAccounts)
    }
  }, [isFetching])

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Metaplex)
    } else {
      setActiveKey(ArtworkViewState.Metaplex)
    }
  }, [connected, setActiveKey])

  const slidesList = (userItems || []).map((item: any) => ({
    Component: () => (
      <Link to={``}>
        <NftCard
          {...{
            name: item?.info?.data?.symbol,
            description: item?.info?.data?.name,
            itemsCount: 1, //hardcoded
            floorPrice: 100,
            isVerified: 1,
            image: item?.info?.data?.uri,
          }}
        />
      </Link>
    ),
  }))

  return (
    <div className={RecentCollectionsCarouselClasses} {...restProps}>
      <div className='container flex flex-col gap-[40px]'>
        <h2 className='w-full text-center text-h4 text-gray-800 md:text-h3 lg:text-left'>
          Recently listed <br className='md:hidden' />
          collections
        </h2>

        <div className='flex w-full items-center px-[40px] lg:px-0'>
          <div className='relative left-[-20px] lg:left-[-40px]'>
            <button className='recent-collections-carousel--prev cursor-pointer appearance-none text-gray-300 hover:text-gray-700 lg:ml-[-25px]'>
              <svg
                width={isMobile ? '16' : '25'}
                height={isMobile ? '28' : '44'}
                viewBox='0 0 25 44'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M23 42L3 22L23 2'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                />
              </svg>
            </button>
          </div>

          <BlockCarousel
            id='recent-collections-carousel'
            options={{
              slidesPerView: 4,
              autoPlay: { delay: 3000 },
              loop: false,
              breakpoints: {
                // when window width is >= 320px
                320: {
                  slidesPerView: 1,
                  spaceBetween: 20,
                },
                // when window width is >= 768px
                768: {
                  slidesPerView: 2,
                  spaceBetween: 30,
                },
                // when window width is >= 1264px
                1170: {
                  slidesPerView: 4,
                  spaceBetween: 40,
                },
              },
            }}
            prevButton={'.recent-collections-carousel--prev'}
            nextButton={'.recent-collections-carousel--next'}
            slides={slidesList}
          />

          <div className='relative right-[-20px] lg:right-[-40px]'>
            <button className='recent-collections-carousel--next cursor-pointer appearance-none text-gray-300 hover:text-gray-700 lg:mr-[-25px]'>
              <svg
                width={isMobile ? '16' : '25'}
                height={isMobile ? '28' : '44'}
                viewBox='0 0 25 44'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M2 2L22 22L2 42'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecentCollectionsCarousel
