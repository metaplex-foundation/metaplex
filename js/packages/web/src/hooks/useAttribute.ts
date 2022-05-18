import { pubkeyToString } from '@oyster/common'
import { useEffect, useState } from 'react'
import { LiveAuctionViewState } from '../ui/views'
import { useAuctionsList } from '../views/home/components/SalesList/hooks/useAuctionsList'
import { useExtendedArt, useExtendedCollection } from './useArt'
import { AuctionView } from './useAuctions'
import { useCollections } from './useCollections'

const useAttribute = (auction: AuctionView) => {
  const { data } = useExtendedArt(auction?.thumbnail.metadata.pubkey)
  const { liveCollections } = useCollections()
  const { getData } = useExtendedCollection()
  const collection = liveCollections.find(({ mint }) => mint === data?.collection) || undefined
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const [mintAttrs, setMintAttrs] = useState<any[]>([])
  const [attributesPercentages, setAttributePercentages] = useState<any[]>([])

  useEffect(() => {
    const allAuctions = auctions.filter(
      auction =>
        auction.thumbnail.metadata.info.collection?.key === pubkeyToString(collection?.mint)
    )

    let All = Promise.all(
      allAuctions.map(async auction => {
        const gData = await getData(auction.thumbnail.metadata.pubkey)
        return { ...gData, _auction: auction }
      })
    )

    if (allAuctions.length === 0) {
      All = Promise.all(
        auctions.map(async auction => {
          const gData = await getData(auction.thumbnail.metadata.pubkey)
          return { ...gData, _auction: auction }
        })
      )
    }
    All.then(res => {
      const attrArray = <any[]>[]
      for (let index = 0; index < res.length; index++) {
        if (res[index].attributes) {
          res[index].attributes.forEach(({ trait_type, value }) => {
            attrArray.push({
              mint: res[index]?._auction?.thumbnail?.metadata?.info?.mint,
              trait_type,
              value,
            })
          })
        }
      }
      setMintAttrs(attrArray)
    })
    console.log('----------calling1-----------------------')
  }, [collection?.mint, auctions.length])

  useEffect(() => {
    let allAuctions = auctions.filter(
      auction =>
        auction.thumbnail.metadata.info.collection?.key === pubkeyToString(collection?.mint)
    )

    if (!allAuctions.length) {
      allAuctions = auctions
    }

    const pArray = <any[]>[]
    mintAttrs.forEach(mintArray => {
      if (mintArray.mint === auction?.thumbnail?.metadata?.info?.mint) {
        const count = mintAttrs.filter(
          ({ mint, trait_type, value }) =>
            mint !== auction?.thumbnail?.metadata?.info?.mint &&
            trait_type === mintArray.trait_type &&
            value === mintArray.value
        ).length

        const percentage = 100 - (count / allAuctions.length) * 100
        pArray.push({
          mint: auction?.thumbnail?.metadata?.info?.mint,
          trait_type: mintArray.trait_type,
          value: mintArray.value,
          percentage: percentage,
        })
      }
    })
    console.log('----------calling-----------------------')
    setAttributePercentages([...pArray])
  }, [mintAttrs.length, auctions.length, auction.auction.pubkey])

  return { attributesPercentages }
}

export default useAttribute
