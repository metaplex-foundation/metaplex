import { CollectionHeader } from '../../sections/CollectionHeader'
import { CollectionBody } from '../../sections/CollectionBody'
import { useLocation } from 'react-router-dom'
import queryString from 'query-string'

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
import _ from 'lodash'

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
  // const connection = useConnection()
  const { search } = useLocation()
  // let [collection, setCollection] = useState<string | null>()
  // const initialDataSet = {
  //   ''
  // }
  const [dataItems, setDataItems] = useState<any[]>([])

  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true)
  const { auctions } = useAuctionsList()

  useEffect(() => {
    setIsCollectionsLoading(true)
    const parsed = queryString.parse(search)
    const newArray: any[] = []
    if (auctions.length > 0) {
      auctions.reduce((r, a) => {
        newArray.push([a as any])
        return r
      })
    }
    const grouped = _.mapValues(
      _.groupBy(newArray, item => item[0].thumbnail.metadata.info.data.creators[0].address)
    )
    if (grouped[parsed.collection ? parsed.collection?.toString() : '']) {
      setDataItems(grouped[parsed.collection ? parsed.collection?.toString() : ''])
    }
    setIsCollectionsLoading(false)
  }, [auctions])
  //////

  return (
    <>
      {isCollectionsLoading && (
        <div className='flex min-h-[396px] w-full justify-center'>
          <Spinner color='#448fff' size={40} />
        </div>
      )}

      {!isCollectionsLoading && !!dataItems[0] && !!dataItems[0][0] && (
        <>
          <CollectionHeader
            pubkey={dataItems[0][0]?.thumbnail?.metadata.pubkey}
            className='pb-[60px]'
          />
          <CollectionBody dataItems={dataItems} className='pb-[100px]' />
        </>
      )}
    </>
  )
}

export default Collection
