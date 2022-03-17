import React, { useEffect, useState, FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'
import { Spinner } from '@oyster/common'

import { BlockCarousel } from '../../molecules/BlockCarousel'
import { NftCard } from '../../molecules/NftCard'

import { useViewport } from '../../../utils/useViewport'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import _ from 'lodash'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'

export interface RecentCollectionsCarouselProps {
  [x: string]: any
}

export const RecentCollectionsCarousel: FC<RecentCollectionsCarouselProps> = ({
  className,
  ...restProps
}: RecentCollectionsCarouselProps) => {
  const { isMobile } = useViewport()
  const RecentCollectionsCarouselClasses = CN(`recent-collections-carousel`, className)

  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true)

  const [dataItems, setDataItems] = useState<any[]>([])

  // new /////
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)

  useEffect(() => {
    setIsCollectionsLoading(true)
    const newArray: any[] = []
    if (auctions.length > 0) {
      auctions.reduce((r, a) => {
        newArray.push([a as any])
        return r
      })
    }
    let grouped = _.mapValues(
      _.groupBy(newArray, item => item[0].thumbnail.metadata.info.data.creators[0].address)
    )
    let group = _.values(grouped)
    setDataItems(group)
    setIsCollectionsLoading(false)
  }, [auctions])

  /// end of new

  const slidesList = (dataItems || []).map((item: any) => ({
    Component: () => (
      <Link
        key={item[0][0].pubkey}
        to={`/collection?collection=${item[0][0].thumbnail.metadata.info.data.creators[0].address}`}>
        <NftCard
          {...{
            pubkey: item[0][0].thumbnail.metadata.pubkey,
            itemsCount: item.length,
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
                xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M23 42L3 22L23 2'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                />
              </svg>
            </button>
          </div>

          {isCollectionsLoading && (
            <div className='flex min-h-[396px] w-full justify-center'>
              <Spinner color='#448fff' size={40} />
            </div>
          )}

          {!isCollectionsLoading && (
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
          )}

          <div className='relative right-[-20px] lg:right-[-40px]'>
            <button className='recent-collections-carousel--next cursor-pointer appearance-none text-gray-300 hover:text-gray-700 lg:mr-[-25px]'>
              <svg
                width={isMobile ? '16' : '25'}
                height={isMobile ? '28' : '44'}
                viewBox='0 0 25 44'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'>
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
