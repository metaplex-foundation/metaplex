import { BuyCard } from '@oyster/common'
import { FC } from 'react'
import { useExtendedArt } from '../../../hooks'

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
  const { data } = useExtendedArt(collection.pubkey)

  const nameProp: { name: string } = { name: data?.name ?? '' }

  if (collection.isExternal && collection._meta?.collection?.name) {
    nameProp.name = collection._meta.collection.name
  }

  return (
    <BuyCard {...rest} {...dx} image={data?.image ?? ''} {...nameProp} onClickButton={() => {}} />
  )
}

export default CollectionCard
