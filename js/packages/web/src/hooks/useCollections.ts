import { AuctionView, AuctionViewState } from './useAuctions'
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata'
import { useAuctionsList } from '../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../views/home/components/SalesList'
import { useEffect, useState } from 'react'
import { StringPublicKey, useMeta } from '@oyster/common'
import { useExtendedCollection } from './useArt'

export interface CollectionView {
  pubkey: StringPublicKey
  mint: StringPublicKey
  data: MetadataData
  state: AuctionViewState
  isExternal: boolean
  _meta?: any
  name?: string
}

export const useCollections = () => {
  const { auctions: liveAuctions } = useAuctionsList(LiveAuctionViewState.All)
  const { auctions: endedAuctions } = useAuctionsList(LiveAuctionViewState.Ended)

  const { metadataByCollection } = useMeta()

  const [liveCollections, setLiveCollections] = useState<CollectionView[]>([])
  const [endedCollections, setEndedCollections] = useState<CollectionView[]>([])

  const { getData } = useExtendedCollection()

  const setCollections = (
    auctions: AuctionView[],
    setStateFunc: (c: CollectionView[]) => void,
    filterMints?: CollectionView[]
  ) => {
    const usedCollections = new Set<string>(filterMints?.map(c => c.mint))
    const collections: CollectionView[] = []

    auctions.forEach(auction => {
      const collection = auction?.thumbnail?.metadata?.info?.collection?.key

      if (collection) {
        if (!usedCollections.has(collection)) {
          const metadata = metadataByCollection[collection]
          if (metadata) {
            usedCollections.add(collection)
            collections.push({
              pubkey: metadata.pubkey,
              mint: collection,
              data: metadata.info as unknown as MetadataData,
              state: auction.state,
              isExternal: false,
            })
          }
        }
      } else {
        getData(auction?.thumbnail?.metadata.pubkey).then(res => {
          const isExit = !!collections.find(({ name }) => name === res?.collection?.name)
          if (res?.collection?.name && !isExit) {
            collections.push({
              pubkey: auction?.thumbnail?.metadata.pubkey,
              mint: collection,
              data: auction?.thumbnail?.metadata?.info as unknown as MetadataData,
              state: auction.state,
              isExternal: true,
              _meta: res,
              name: res?.collection?.name,
            })
          }
        })
      }
    })
    setStateFunc(collections)
  }

  useEffect(() => {
    setCollections(liveAuctions, setLiveCollections)
  }, [liveAuctions])

  useEffect(() => {
    setCollections(endedAuctions, setEndedCollections, liveCollections)
  }, [endedAuctions, liveCollections])

  return { liveCollections, endedCollections }
}

export const useNFTCollections = () => {
  const [liveCollections, setLiveCollections] = useState<CollectionView[]>([])
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const { metadataByCollection } = useMeta()
  const { getData } = useExtendedCollection()

  useEffect(() => {
    getCollections()
  }, [auctions.length])

  const getCollections = (filterMints?: CollectionView[]) => {
    const usedCollections = new Set<string>(filterMints?.map(c => c.mint))
    const collections: CollectionView[] = []

    auctions.forEach(auction => {
      const collection = auction?.thumbnail?.metadata?.info?.collection?.key

      if (collection) {
        if (!usedCollections.has(collection)) {
          const metadata = metadataByCollection[collection]

          if (!metadata) {
            collections.push({
              pubkey: auction.thumbnail.metadata.pubkey,
              mint: collection,
              //@ts-ignore
              data: auction.thumbnail.metadata.info,
              state: auction.state,
              isExternal: false,
            })
          }

          if (metadata) {
            usedCollections.add(collection)
            collections.push({
              pubkey: metadata.pubkey,
              mint: collection,
              data: metadata.info as unknown as MetadataData,
              state: auction.state,
              isExternal: false,
            })
          }
        }
      } else {
        getData(auction?.thumbnail?.metadata.pubkey).then(res => {
          const isExit = !!collections.find(({ name }) => name === res?.collection?.name)
          if (res?.collection?.name && !isExit) {
            collections.push({
              pubkey: auction?.thumbnail?.metadata.pubkey,
              mint: collection,
              data: auction?.thumbnail?.metadata?.info as unknown as MetadataData,
              state: auction.state,
              isExternal: true,
              name: res?.collection?.name,
              _meta: res,
            })
          }
        })
      }
    })
    setLiveCollections(collections)
  }

  return {
    liveCollections,
  }
}
