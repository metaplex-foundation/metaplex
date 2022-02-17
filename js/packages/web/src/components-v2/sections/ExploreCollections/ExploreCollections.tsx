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
  const { push } = useHistory()
  const { search } = useLocation()
  const { pid } = queryString.parse(search) || {}

  const { storeAddress } = useStore()

  const ExploreCollectionsClasses = CN(`explore-collections py-[80px]`, className)

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
    <div className={ExploreCollectionsClasses} {...restProps}>
      <div className='container flex flex-col items-center'>
        <h1 className='text-h2 font-500'>Explore collections</h1>

        <div className='flex w-full max-w-[480px] pt-[20px]'>
          <TextField
            iconBefore={<i className='ri-search-2-line' />}
            placeholder='Search for traits, tags, item #s, and more...'
            size='sm'
            wrapperClassName='!border-transparent !bg-gray-100 !w-full focus-within:!bg-white'
          />
        </div>

        <div className='flex gap-[32px] pt-[40px] pb-[80px]'>
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

        <div className='grid grid-cols-4 gap-x-[32px] gap-y-[32px] pb-[100px]'>
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
                  to={`/collection?collection=${item.extradata?.collection?.name}`}>
                  <NftCard {...temp} />
                </Link>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export default ExploreCollections
