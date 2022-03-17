import { BidCard } from '@oyster/common'
import { FC } from 'react'
import { AuctionView } from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'

interface LiveNFTCardProps {
  className: string
  onClickButton?: () => void
  hasIndicator?: boolean
  auction: AuctionView
}

const LiveNFTCard: FC<LiveNFTCardProps> = ({ auction, ...rest }) => {
  const {
    data,
    value: { priceNaN, solVal, usdValFormatted },
    remaining: { remainingHours, remainingMinutes, remainingSeconds },
  } = useNFTData(auction)

  const creator = data?.properties?.creators?.length && data?.properties?.creators[0]

  let avatarLabel = ''
  if (creator && creator.address) {
    avatarLabel =
      creator?.address.slice(0, 6) + '...' + creator?.address.slice(creator?.address.length - 6)
  }
  return (
    <BidCard
      {...rest}
      avatar='https://images.unsplash.com/photo-1511485977113-f34c92461ad9?crop=faces&fit=crop&h=200&w=200'
      avatarLabel={avatarLabel}
      image={data?.image ?? ''}
      remainingTime={`${remainingHours}h : ${remainingMinutes}m : ${remainingSeconds}s`}
      price={!priceNaN ? `Ⓞ ${solVal} SOL` : ''}
      dollarValue={usdValFormatted}
    />
  )
}

export default LiveNFTCard
