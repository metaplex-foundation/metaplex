import { BidCardAlt } from '@oyster/common'
import { FC } from 'react'
import { useAuctionStatus } from '../../../components/AuctionRenderCard/hooks/useAuctionStatus'
import { useTokenList } from '../../../contexts/tokenList'
import { AuctionView, useArt, useCreators } from '../../../hooks'

interface AuctionsCardProps {
  auction: AuctionView
}

const AuctionsCard: FC<AuctionsCardProps> = ({ auction }) => {
  const id = auction.thumbnail.metadata.pubkey
  const art = useArt(id)
  const creators = useCreators(auction)

  const avatarLabel = art?.title || ' '
  const image = art.uri || ''

  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == auction.auction.info.tokenMint
  )[0]
  const { status, amount } = useAuctionStatus(auction)

  console.log('tokenInfo', art)

  return (
    <BidCardAlt
      avatar={undefined}
      avatarLabel={avatarLabel}
      image={image}
      remainingTime={'20h : 35m : 08s'}
      price={'Ⓞ 0.25 SOL'}
      dollarValue={'$154.00'}
      onClickButton={() => {}}
    />
  )
}
export default AuctionsCard
