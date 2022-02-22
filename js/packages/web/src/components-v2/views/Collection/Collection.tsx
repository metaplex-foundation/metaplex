import { CollectionHeader } from '../../sections/CollectionHeader'
import { CollectionBody } from '../../sections/CollectionBody'
import { useLocation } from 'react-router-dom'

import React, { FC, useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'

import {
  MetadataKey,
  pubkeyToString,
  StringPublicKey,
  useConnection,
  useStore,
  Spinner,
  useViewport,
  Button,
} from '@oyster/common'
import bs58 from 'bs58'
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

export interface CollectionProps {
  [x: string]: any
}

interface IToken {
  mint: PublicKey
  address: PublicKey
  metadataPDA?: PublicKey
  metadataOnchain?: MetadataData
}

export const Collection: FC<CollectionProps> = () => {
  ///////////////
  const connection = useConnection()
  const search = useLocation().search
  const name = new URLSearchParams(search).get('collection')
  let [collection, setCollection] = useState<string | null>()

  const initialValue: any[] = []
  const [dataItems, setDataItems] = useState(initialValue)

  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true)

  useEffect(() => {
    const getUserItems = async () => {
      let collectionName = name
      setCollection(collectionName)
      const baseFilters = [
        // Filter for MetadataV1 by key
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(Buffer.from([MetadataKey.MetadataV1])),
          },
        },
      ].filter(Boolean)

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

      group = group.filter(elem => {
        return elem[0][0].extradata?.collection?.name == collectionName
      })

      setDataItems(group[0][0])
      console.log(group[0][0])
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

  //////

  return (
    <>
      {isCollectionsLoading && (
        <div className='flex min-h-[396px] w-full justify-center'>
          <Spinner color='#448fff' size={40} />
        </div>
      )}
      {!isCollectionsLoading && (
        <>
          <CollectionHeader dataItems={dataItems} className='pb-[60px]' />
          <CollectionBody dataItems={dataItems} className='pb-[100px]' />
        </>
      )}
    </>
  )
}

export default Collection
