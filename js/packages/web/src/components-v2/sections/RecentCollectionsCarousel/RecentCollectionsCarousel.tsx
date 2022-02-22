import React, { useEffect, useState, FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'
import { MetadataKey, StringPublicKey, useConnection, Spinner } from '@oyster/common'

import { BlockCarousel } from '../../molecules/BlockCarousel'
import { NftCard } from '../../molecules/NftCard'
import { ArtworkViewState } from '../../../views/artworks/types'
import { useItems } from '../../../views/artworks/hooks/useItems'

import { useViewport } from '../../../utils/useViewport'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

import { Metadata, MetadataData } from '@metaplex-foundation/mpl-token-metadata'
import { useGroupedAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import _ from 'lodash'

export interface RecentCollectionsCarouselProps {
  [x: string]: any
}

interface IToken {
  mint: PublicKey
  address: PublicKey
  metadataPDA?: PublicKey
  metadataOnchain?: MetadataData
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
  const { auctions } = useGroupedAuctionsList()

  useEffect(() => {
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
  }, [])

  /// end of new

  const slidesList = (dataItems || []).map((item: any) => ({
    Component: () => (
      <Link
        key={item[0][0].pubkey}
        to={`/collection?collection=${item[0][0].extradata?.collection?.name}`}>
        <NftCard
          {...{
            name: item[0][0].moredata?.collection?.name,
            description: item[0][0]?.moredata?.description,
            itemsCount: item[0].length,
            floorPrice: 0,
            isVerified: 1,
            image: item[0][0]?.moredata?.image,
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
