import { AuctionView, AuctionViewState } from './useAuctions'
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata'
import { useAuctionsList } from '../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../views/home/components/SalesList'
import { useCallback, useEffect, useState } from 'react'
import { StringPublicKey, useMeta } from '@oyster/common'
import { useExtendedCollection } from './useArt'

export interface CollectionView {
  pubkey: StringPublicKey
  mint: StringPublicKey
  data: MetadataData
  state: AuctionViewState
  isExternal: boolean
  _meta?: any
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
        const isExit = !!collections.find(
          ({ pubkey }) => pubkey === auction?.thumbnail?.metadata.pubkey
        )
        if (!isExit) {
          getData(auction?.thumbnail?.metadata.pubkey).then(res => {
            if (res?.collection?.name && !isExit) {
              collections.push({
                pubkey: auction?.thumbnail?.metadata.pubkey,
                mint: collection,
                data: auction?.thumbnail?.metadata?.info as unknown as MetadataData,
                state: auction.state,
                isExternal: true,
                _meta: res,
              })
            }
          })
        }
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
    console.log('auctions.length', auctions.length)
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
        const isExit = !!collections.find(
          ({ pubkey }) => pubkey === auction?.thumbnail?.metadata.pubkey
        )
        if (!isExit) {
          getData(auction?.thumbnail?.metadata.pubkey).then(res => {
            if (res?.collection?.name && !isExit) {
              collections.push({
                pubkey: auction?.thumbnail?.metadata.pubkey,
                mint: collection,
                data: auction?.thumbnail?.metadata?.info as unknown as MetadataData,
                state: auction.state,
                isExternal: true,
                _meta: res,
              })
            }
          })
        }
      }
    })
    setLiveCollections(collections)
  }

  return {
    liveCollections,
  }
}
