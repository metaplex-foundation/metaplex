import { BuyCard, useConnection } from '@oyster/common'
import { FC, useEffect, useState } from 'react'
import { useAhExtendedArt, useExtendedArt } from '../../../hooks'
import { Connection, programs } from '@metaplex/js'
import { useAhCollectionVolume } from '../../../hooks/useCollections'
const {
  metadata: { Metadata },
} = programs
interface CollectionCardProps {
  collection: any
  hasButton?: boolean
}

const dx = {
  volume: '472.54',
  floorPrice: 'Ⓞ 0.25 SOL',
  dollarValue: '$154.00',
  link: '#',
}

const CollectionCard: FC<CollectionCardProps> = ({ collection, ...rest }) => {
  const { data } = useAhExtendedArt(collection.nfts[0].metadata)
  const { collectionVolume } = useAhCollectionVolume(collection.collection)

  if (!!data) {
    // // console.log('CollectionCard', data)
    const nameProp: { name: string } = { name: (data?.collection as any).name ?? '' }

    if (collection.isExternal && collection._meta?.collection?.name) {
      nameProp.name = collection._meta.collection.name
    }
    //@ts-ignore
    if (data?.collection?.name) {
      //@ts-ignore
      nameProp.name = data?.collection?.name
    }

    let dx = {
      volume: '472.54',
      floorPrice: 'Ⓞ 0.25 SOL',
      dollarValue: '$154.00',
      link: '#',
    }

    if (!!collectionVolume) {
      dx = {
        volume: collectionVolume.nftTotalSales.total_sol,
        floorPrice: '',
        dollarValue:
          '$' +
          (collectionVolume.nftTotalSales.total_usd ? collectionVolume.total_usd.toString() : ''),
        link: '#',
      }
    }

    return (
      <BuyCard {...rest} {...dx} image={data?.image ?? ''} {...nameProp} onClickButton={() => {}} />
    )
  }
  return <></>
}

export default CollectionCard
