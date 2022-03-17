import { formatAmount, WRAPPED_SOL_MINT } from '@oyster/common'
import currency from 'currency.js'
import { useEffect, useState } from 'react'
import { useAuctionStatus } from '../components/AuctionRenderCard/hooks/useAuctionStatus'
import { useAllSplPrices, useSolPrice } from '../contexts'
import { useTokenList } from '../contexts/tokenList'
import { useExtendedArt } from './useArt'
import { useAuctionCountdown } from './useAuctionCountdown'
import { AuctionView } from './useAuctions'

const useNFTData = (auction: AuctionView) => {
  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined)
  const id = auction?.thumbnail?.metadata?.pubkey

  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == auction.auction.info.tokenMint
  )[0]
  const { amount: _amount } = useAuctionStatus(auction)
  const state = useAuctionCountdown(auction)
  const { data } = useExtendedArt(id)

  const amount = typeof _amount === 'string' ? parseFloat(_amount) : _amount
  let solVal = `${amount}`
  if (amount >= 1) {
    solVal = formatAmount(amount)
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

  const usdValFormatted = currency(priceUSD || 0).format()
  const priceNaN = isNaN(amount)

  return {
    data: data,
    value: { usdValFormatted, usdVal: priceUSD, solVal, priceNaN },
    remaining: {
      remainingHours,
      remainingMinutes,
      remainingSeconds,
    },
  }
}

export default useNFTData
