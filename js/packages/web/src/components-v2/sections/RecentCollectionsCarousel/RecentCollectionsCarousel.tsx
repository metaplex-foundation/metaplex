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

  // useEffect(() => {
  //   if (!isFetching) {
  //     pullItemsPage(userAccounts)
  //   }
  // }, [isFetching])

  // useEffect(() => {
  //   if (connected) {
  //     setActiveKey(ArtworkViewState.Metaplex)
  //   } else {
  //     setActiveKey(ArtworkViewState.Metaplex)
  //   }
  // }, [connected, setActiveKey])

  ///////////////
  const connection = useConnection()
  const [activeKey] = useState(ArtworkViewState.Metaplex)

  const userItems = useItems({ activeKey })

  const initialValue: any[] = []
  const [dataItems, setDataItems] = useState(initialValue)

  useEffect(() => {
    const getUserItems = async () => {
      async function getHolderByMint(mint: PublicKey): Promise<PublicKey> {
        const tokens = await connection.getTokenLargestAccounts(mint)
        return tokens.value[0].address // since it's an NFT, we just grab the 1st account
      }

      async function deserializeMetadata(rawMetadata: any) {
        return await Metadata.load(connection, rawMetadata.pubkey)
      }

      async function metadatasToTokens(rawMetadatas: any[]): Promise<IToken[]> {
        const promises = await Promise.all(
          rawMetadatas.map(async m => {
            try {
              const metadata = await deserializeMetadata(m)
              const mint = new PublicKey(metadata.data.mint)
              const address = await getHolderByMint(mint)
              return {
                mint,
                address,
                metadataPDA: metadata.pubkey,
                metadataOnchain: metadata.data,
              } as IToken
            } catch (e) {
              console.log('failed to deserialize one of the fetched metadatas')
            }
          })
        )
        return promises.filter(t => !!t) as IToken[]
      }

      const baseFilters = [
        // Filter for MetadataV1 by key
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(Buffer.from([MetadataKey.MetadataV1])),
          },
        },
      ].filter(Boolean)

      const rawMetadatas = await connection.getProgramAccounts(
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as StringPublicKey),
        {
          filters: [
            ...baseFilters,
            {
              memcmp: {
                offset: 1,
                bytes: '7gvSzhM46gNzXUyg7Lidmu8cEPkeVWrGyXsBMgKwyMmk',
              },
            },
          ],
        }
      )
      const alldata = await metadatasToTokens(rawMetadatas)

      const tempArray: any[] = []
      for (const element of alldata) {
        const t = {
          pubkey: element.address.toBase58(),
          extradata: await getMoreData(
            element.address.toBase58(),
            element.metadataOnchain?.data.uri
          ),
          item: element,
        }
        tempArray.push(t)
      }
      let group = tempArray.reduce((r, a) => {
        r[a.extradata?.collection?.name] = [...(r[a.extradata?.collection?.name] || []), a]
        return r
      })
      delete group['extradata']
      delete group['item']
      delete group['pubkey']
      group = Object.keys(group).map(key => [group[key]])
      console.log(group)
      setDataItems(group)
      setIsCollectionsLoading(false)
    }
    getUserItems()
  }, [userItems])

  const getMoreData = async (id, itemuri) => {
    const USE_CDN = false
    const routeCDN = (uri: string) => {
      let result = uri
      if (USE_CDN) {
        result = uri.replace('https://arweave.net/', 'https://coldcdn.com/api/cdn/bronil/')
      }

      return result
    }

    if (itemuri) {
      const uri = routeCDN(itemuri)

      const processJson = (extended: any) => {
        if (!extended || extended?.properties?.files?.length === 0) {
          return
        }

        if (extended?.image) {
          const file = extended.image.startsWith('http')
            ? extended.image
            : `${itemuri}/${extended.image}`
          extended.image = routeCDN(file)
        }

        return extended
      }
      const data = await fetch(uri)
      const rdata = processJson(data.json())

      return rdata
    }
  }

  const slidesList = (dataItems || []).map((item: any) => ({
    Component: () => (
      <Link to={``}>
        <NftCard
          {...{
            name: item[0][0].extradata?.collection?.name,
            description: item[0][0]?.extradata?.description,
            itemsCount: item[0].length, //hardcoded
            floorPrice: 100,
            isVerified: 1,
            image: item[0][0]?.extradata?.image,
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
