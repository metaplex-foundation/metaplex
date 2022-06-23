import { BuyCard } from '@oyster/common'
import { FC } from 'react'
import { useAhExtendedArt } from '../../../hooks'
import { programs } from '@metaplex/js'
const {
  metadata: { Metadata },
} = programs
interface CollectionCardProps {
  collection: any
  hasButton?: boolean
  collectionVolume: any
}

const CollectionCard: FC<CollectionCardProps> = ({ collection, collectionVolume, ...rest }) => {
  const { data } = useAhExtendedArt(collection.nfts[0].metadata)

  if (!!data?.collection) {
    const nameProp: { name: string } = { name: (data?.collection as any).name ?? '' }

    if (collection.isExternal && collection._meta?.collection?.name) {
      nameProp.name = collection._meta.collection.name
    }
    //@ts-ignore
    if (data?.collection?.name) {
      //@ts-ignore
      nameProp.name = data?.collection?.name
    }

    const findStatForThisCollection = () => {
      if (!!collectionVolume) {
        const res = collectionVolume.nftStates.find(val => {
          return val.NFTName == collection.collection
        })
        return res
      }
    }

    let dx = {
      volume: '',
      floorPrice: '',
      dollarValue: '',
      link: '#',
    }
    if (!!collectionVolume) {
      dx = {
        volume: findStatForThisCollection().volume.volumeAmount,
        floorPrice: findStatForThisCollection().floorPrice.floorSolAmount,
        dollarValue: '',
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
