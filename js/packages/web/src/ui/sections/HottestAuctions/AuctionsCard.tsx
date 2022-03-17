import { FC } from 'react'
import { AuctionView } from '../../../hooks'
import { BidCardAlt } from '@oyster/common'
import useNFTData from '../../../hooks/useNFTData'

interface AuctionsCardProps {
  auction: AuctionView
}

const AuctionsCard: FC<AuctionsCardProps> = ({ auction }) => {
  const {
    data,
    value: { priceNaN, solVal, usdValFormatted },
    remaining: { remainingHours, remainingMinutes, remainingSeconds },
  } = useNFTData(auction)

  return (
    <BidCardAlt
      image={data?.image ?? ''}
      remainingTime={`${remainingHours}h : ${remainingMinutes}m : ${remainingSeconds}s`}
      price={!priceNaN ? `Ⓞ ${solVal} SOL` : ''}
      dollarValue={usdValFormatted}
      onClickButton={() => {}}
    />
  )
}
export default AuctionsCard
