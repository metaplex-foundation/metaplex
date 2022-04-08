import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { Parallax } from 'react-parallax'
import { Avatar } from '../../atoms/Avatar'
import VerifiedBadge from '../../icons/VerifiedBadge'
import IdentityIcon from '../../icons/Identity'
import { StatsCard } from '../../molecules/StatsCard'
import { useExtendedArt } from '../../../hooks'
import { useLocation } from 'react-router-dom'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import queryString from 'query-string'
import _ from 'lodash'
import { Spinner } from '@oyster/common'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'

export interface CollectionHeaderProps {
  [x: string]: any
}

export const CollectionHeader: FC<CollectionHeaderProps> = ({
  className,
  pubkey,
  dataItem,
  ...restProps
}: CollectionHeaderProps) => {
  const CollectionHeaderClasses = CN(`collection-header bg-white`, className)
  const [isFavorite, setIsFavorite] = useState(true)
  const [isShowFullBio, setIsShowFullBio] = useState(false)

  const { ref, data } = useExtendedArt(pubkey)

  // return <></>

  ///////////////
  const { search } = useLocation()
  const [dataItems, setDataItems] = useState<any>()

  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true)
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)

  useEffect(() => {
    setIsCollectionsLoading(true)
    if (auctions[0]) {
      setDataItems(data)
      setIsCollectionsLoading(false)
    }
  }, [auctions])

  return (
    <>
      {isCollectionsLoading && (
        <div className='flex min-h-[396px] w-full justify-center'>
          <Spinner color='#448fff' size={40} />
        </div>
      )}
      {!isCollectionsLoading && (
        <div className={CollectionHeaderClasses} {...restProps}>
          <Parallax
            blur={0}
            bgImage={'/img/collection-banner.png'}
            bgImageAlt='Karmaplex'
            strength={200}
            bgClassName='!object-cover !object-center !h-[200px] lg:!h-[300px] !w-full'>
            <div className='flex h-[180px] w-full lg:h-[280px]' />
          </Parallax>

          <div className='container relative z-10 mt-[-75px]'>
            <div className='flex w-full justify-center lg:justify-start'>
              <Avatar image={(data as any)?.image} size='lg' hasBorder />
            </div>

            <div className='flex w-full flex-col pt-[16px] lg:flex-row'>
              <div className='flex flex-col items-center lg:items-start'>
                <h1 className='mb-[4px] text-h2 font-600'>{(data as any)?.collection.name}</h1>

                <div className='flex w-full flex-col items-center gap-[16px] lg:flex-row'>
                  <span className='text-B-400'>
                    {/* Created by {(dataItems as any)?.properties.creators[0].address.substring(0, 10)} */}
                  </span>
                  <div className='flex items-center gap-[16px]'>
                    <VerifiedBadge width={24} height={24} />
                    <button
                      onClick={() => setIsFavorite(!isFavorite)}
                      className='inline-flex appearance-none items-center text-[24px]'>
                      {!isFavorite ? (
                        <i className='ri-heart-line' />
                      ) : (
                        <i className='ri-heart-fill text-red-400' />
                      )}
                    </button>
                    <IdentityIcon />
                  </div>
                </div>

                <div className='flex w-full justify-center px-[32px] pt-[12px] text-center text-gray-700 lg:max-w-[370px] lg:justify-start lg:px-0 lg:text-left'>
                  <p>{(data as any)?.collection.name}</p>
                  {/* {!isShowFullBio ? (
                <p>
                  Belugies is a generative NFT collection artistically illustrated by a 14 year old
                  artist. Since its inception October 16th, 2021 Belugies...
                  <a
                    onClick={() => setIsShowFullBio(!isShowFullBio)}
                    className='text-B-400 pl-[4px] cursor-pointer'>
                    Read More
                  </a>
                </p>
              ) : (
                <p>
                  Belugies is a generative NFT collection artistically illustrated by a 14 year old
                  artist. Since its inception October 16th, 2021 Belugies has donated $200,000.00 to
                  multiple nonprofit organizations including Beluga Whale Alliance, Ocean Defenders
                  Alliance, and Sunshine Kids children with cancer foundation. Created by a young
                  artist and her family members Belugies aims to build a global community based
                  around giving back and doing good for the world. #UgieUgie
                  <a
                    onClick={() => setIsShowFullBio(!isShowFullBio)}
                    className='text-B-400 pl-[4px] cursor-pointer'>
                    Show Less
                  </a>
                </p>
              )} */}
                </div>

                <div className='flex items-center gap-[16px] pt-[16px] text-[24px]'>
                  <button className='appearance-none text-gray-700 transition-all hover:text-B-400'>
                    <i className='ri-discord-fill' />
                  </button>

                  <button className='appearance-none text-gray-700 transition-all hover:text-B-400'>
                    <i className='ri-twitter-fill' />
                  </button>

                  <button className='appearance-none text-gray-700 transition-all hover:text-B-400'>
                    <i className='ri-global-line' />
                  </button>
                </div>
              </div>

              <div className='flex w-full pt-[32px] lg:ml-auto lg:w-[unset] lg:pt-[62px]'>
                <div className='block w-full'>
                  <StatsCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CollectionHeader
