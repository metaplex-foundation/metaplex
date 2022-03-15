import currency from 'currency.js'
import { FC, useEffect, useState } from 'react'
import { useAuctionStatus } from '../../../components/AuctionRenderCard/hooks/useAuctionStatus'
import { useAllSplPrices, useSolPrice } from '../../../contexts'
import { useTokenList } from '../../../contexts/tokenList'
import { AuctionView, useArt, useExtendedArt } from '../../../hooks'
import { useAuctionCountdown } from '../../../hooks/useAuctionCountdown'
import { BidCardAlt, formatAmount, WRAPPED_SOL_MINT } from '@oyster/common'

interface AuctionsCardProps {
  auction: AuctionView
}

const AuctionsCard: FC<AuctionsCardProps> = ({ auction }) => {
  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined)
  const id = auction.thumbnail.metadata.pubkey
  const art = useArt(id)

  const image = art.uri || ''

  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == auction.auction.info.tokenMint
  )[0]
  const { amount: _amount } = useAuctionStatus(auction)
  const state = useAuctionCountdown(auction)
  const { data } = useExtendedArt(id)

  const amount = typeof _amount === 'string' ? parseFloat(_amount) : _amount
  let formattedAmount = `${amount}`
  if (amount >= 1) {
    formattedAmount = formatAmount(amount)
  }

  const remainingHours = (state?.hours || 0) + (state?.days || 0) * 24
  const remainingMinutes = state?.minutes || 0
  const remainingSeconds = state?.seconds || 0

  const solPrice = useSolPrice()
  const altSplPrice = useAllSplPrices().filter(a => a.tokenMint == tokenInfo?.address)[0]
    ?.tokenPrice
  const tokenPrice = tokenInfo?.address == WRAPPED_SOL_MINT.toBase58() ? solPrice : altSplPrice

  useEffect(() => {
    setPriceUSD(tokenPrice * amount)
  }, [amount, tokenPrice, altSplPrice])

  const dollarValue = currency(priceUSD || 0).format()

  const PriceNaN = isNaN(amount)

  return (
    <BidCardAlt
      image={data?.image ?? ''}
      remainingTime={`${remainingHours}h : ${remainingMinutes}m : ${remainingSeconds}s`}
      price={!PriceNaN ? `Ⓞ ${formattedAmount} SOL` : ''}
      dollarValue={dollarValue}
      onClickButton={() => {}}
    />
  )
}
export default AuctionsCard
