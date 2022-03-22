import { BuyCard } from '@oyster/common'
import { FC } from 'react'
import { useExtendedArt } from '../../../hooks'
import { Link } from 'react-router-dom'

interface CollectionCardProps {
  collection: any
}

const dx = {
  volume: '472.54',
  floorPrice: 'Ⓞ 0.25 SOL',
  dollarValue: '$154.00',
  link: '#',
}

const CollectionCard: FC<CollectionCardProps> = ({ collection }) => {
  const { data } = useExtendedArt(collection.pubkey)

  return (
    <Link to={`/collection/${collection.pubkey}`}>
      <BuyCard {...dx} image={data?.image ?? ''} name={data?.name ?? ''} onClickButton={() => {}} />
    </Link>
  )
}

export default CollectionCard
