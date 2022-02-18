import CN from 'classnames'
import queryString from 'query-string'
import { Link, useHistory, useLocation } from 'react-router-dom'

import { categories } from '../../../../dummy-data/categories'

import { TextField } from '../../atoms/TextField'
import { TabHighlightButton } from '../../atoms/TabHighlightButton'

import React, { useEffect, useState, FC } from 'react'
import { useItems } from '../../../views/artworks/hooks/useItems'
import { ArtworkViewState } from '../../../views/artworks/types'
import { NftCard } from '../../molecules/NftCard'
import {
  MetadataKey,
  pubkeyToString,
  StringPublicKey,
  useConnection,
  useStore,
  Spinner,
  useViewport,
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
  Button,
} from '@oyster/common'
import bs58 from 'bs58'
import { PublicKey } from '@solana/web3.js'
import { actions, programs } from '@metaplex/js'
import { getPhantomWallet } from '@solana/wallet-adapter-wallets'

const {
  metaplex: { Store, AuctionManager },
  auction: { Auction, AuctionExtended, AuctionData },
  vault: { Vault },
} = programs

import { Metadata, MetadataData } from '@metaplex-foundation/mpl-token-metadata'
import { useExtendedArt, useStoreAuctionsList } from '../../../hooks'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'

export interface ExploreCollectionsProps {
  [x: string]: any
}

interface IToken {
  mint: PublicKey
  address: PublicKey
  metadataPDA?: PublicKey
  metadataOnchain?: MetadataData
}

export const ExploreCollections: FC<ExploreCollectionsProps> = ({
  className,
  ...restProps
}: ExploreCollectionsProps) => {
  const ExploreCollectionsClasses = CN(`explore-collections py-[40px] lg:py-[80px]`, className)
  const { push } = useHistory()
  const { search } = useLocation()
  const { pid } = queryString.parse(search) || {}

  const { storeAddress } = useStore()

  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true)
  const { isDesktop, isMobile } = useViewport()

  ///////////////
  const connection = useConnection()

  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All)

  const initialValue: any[] = []
  const [dataItems, setDataItems] = useState(initialValue)

  useEffect(() => {
    const getUserItems = async () => {
      const baseFilters = [
        // Filter for MetadataV1 by key
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(Buffer.from([MetadataKey.MetadataV1])),
          },
        },
      ].filter(Boolean)

      //
      const auctionManagers = await AuctionManager.findMany(connection, {
        store: storeAddress,
      })
      const auctions = await Promise.all(auctionManagers.map(m => m.getAuction(connection)))

      async function deserializeAuctiondata(rawMetadata: programs.auction.Auction) {
        const id = pubkeyToString(rawMetadata.pubkey)
        const meta = AuctionData.deserialize(rawMetadata.info.data)
        debugger
        return id
      }

      async function getAllAuctionMeta(metadatas: any[]): Promise<any[]> {
        const promises = await Promise.all(
          auctions.map(async m => {
            const meta = m.pubkey.toBase58()
            return { meta }
          })
        )
        return promises.filter(t => !!t)
      }
      console.log(await getAllAuctionMeta(auctions))
      //

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
            debugger
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
      debugger
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
      setDataItems(group)

      setIsCollectionsLoading(false)
    }
    getUserItems()
  }, [])

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

  return (
    ////
    <div className={ExploreCollectionsClasses} {...restProps}>
      <div className='container flex flex-col items-center'>
        <h1 className='text-center text-h2 font-500'>
          Explore <br className='md:hidden' />
          collections
        </h1>

        <div className='mb:pb-0 flex w-full max-w-[480px] pt-[20px] pb-[20px]'>
          <TextField
            iconBefore={<i className='ri-search-2-line' />}
            placeholder='Search for traits, tags, item #s, and more...'
            size='sm'
            wrapperClassName='!border-transparent !bg-gray-100 !w-full focus-within:!bg-white'
          />
        </div>

        {isMobile && (
          <Dropdown className='mb-[20px] w-full max-w-[480px]'>
            {({ isOpen, setIsOpen, innerValue, setInnerValue }: any) => {
              const onSelectOption = (value: string) => {
                setInnerValue(value)
                setIsOpen(false)
              }

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <Button
                      appearance='secondary'
                      view='outline'
                      size='md'
                      iconAfter={<i className='ri-arrow-down-s-line flex' />}
                      className='w-full border-gray-200'>
                      {innerValue ? `Filter: ${innerValue}` : 'Filter collections'}
                    </Button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align='center'
                      className='w-full border-x border-b border-B-10 shadow-lg shadow-B-700/5'>
                      {categories?.map(({ label, value }: any, index: number) => {
                        return (
                          <>
                            <DropDownMenuItem
                              isActive={pid === value}
                              key={value || index}
                              onClick={() => {
                                push(`/explore?pid=${value}`)
                                onSelectOption(label)
                              }}>
                              {label}
                            </DropDownMenuItem>
                          </>
                        )
                      })}
                    </DropDownBody>
                  )}
                </>
              )
            }}
          </Dropdown>
        )}

        {!isMobile && (
          <div className='flex gap-[16px] lg:gap-[32px] pt-[40px] pb-[80px]'>
            {categories?.map(({ label, value }: any, index: number) => {
              return (
                <TabHighlightButton
                  isActive={pid === value}
                  key={value || index}
                  onClick={() => {
                    push(`/explore?pid=${value}`)
                  }}>
                  {label}
                </TabHighlightButton>
              )
            })}
          </div>
        )}

        {isCollectionsLoading && (
          <div className='flex min-h-[396px] w-full justify-center'>
            <Spinner color='#448fff' size={40} />
          </div>
        )}

        {!isCollectionsLoading && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-x-[32px] gap-y-[32px] pb-[100px] lg:grid-cols-4'>
            {pid === 'trending' &&
              dataItems.map((item: any) => {
                const collectionName = item[0][0].extradata?.collection?.name
                const len = item[0].length
                item = item[0][0]
                const temp = {
                  name: collectionName,
                  description: item?.extradata?.description,
                  itemsCount: len,
                  floorPrice: 100,
                  isVerified: 1,
                  image: item?.extradata?.image,
                }
                return (
                  <Link
                    key={item.pubkey}
                    to={`/collection?collection=${item.extradata?.collection?.name}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'collectibles' &&
              dataItems.map((item: any) => {
                const collectionName = item[0][0].extradata?.collection?.name
                const len = item[0].length
                item = item[0][0]
                const temp = {
                  name: collectionName,
                  description: item?.extradata?.description,
                  itemsCount: len,
                  floorPrice: 100,
                  isVerified: 1,
                  image: item?.extradata?.image,
                }
                return (
                  <Link
                    key={item.pubkey}
                    to={`/collection?collection=${item.extradata?.collection?.name}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'art' &&
              dataItems.map((item: any) => {
                const collectionName = item[0][0].extradata?.collection?.name
                const len = item[0].length
                item = item[0][0]
                const temp = {
                  name: collectionName,
                  description: item?.extradata?.description,
                  itemsCount: len,
                  floorPrice: 100,
                  isVerified: 1,
                  image: item?.extradata?.image,
                }
                return (
                  <Link
                    key={item.pubkey}
                    to={`/collection?collection=${item.extradata?.collection?.name}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'charity' &&
              dataItems.map((item: any) => {
                const collectionName = item[0][0].extradata?.collection?.name
                const len = item[0].length
                item = item[0][0]
                const temp = {
                  name: collectionName,
                  description: item?.extradata?.description,
                  itemsCount: len,
                  floorPrice: 100,
                  isVerified: 1,
                  image: item?.extradata?.image,
                }
                return (
                  <Link
                    key={item.pubkey}
                    to={`/collection?collection=${item.extradata?.collection?.name}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'gaming' &&
              dataItems.map((item: any) => {
                const collectionName = item[0][0].extradata?.collection?.name
                const len = item[0].length
                item = item[0][0]
                const temp = {
                  name: collectionName,
                  description: item?.extradata?.description,
                  itemsCount: len,
                  floorPrice: 100,
                  isVerified: 1,
                  image: item?.extradata?.image,
                }
                return (
                  <Link
                    key={item.pubkey}
                    to={`/collection?collection=${item.extradata?.collection?.name}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'utility' &&
              dataItems.map((item: any) => {
                const collectionName = item[0][0].extradata?.collection?.name
                const len = item[0].length
                item = item[0][0]
                const temp = {
                  name: collectionName,
                  description: item?.extradata?.description,
                  itemsCount: len,
                  floorPrice: 100,
                  isVerified: 1,
                  image: item?.extradata?.image,
                }
                return (
                  <Link
                    key={item.pubkey}
                    to={{
                      pathname: `/collection?collection=${item.extradata?.collection?.name}`,
                      state: {
                        item: item[0],
                      },
                    }}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExploreCollections

//                    to={`/collection?collection=${item.extradata?.collection?.name}`}>
