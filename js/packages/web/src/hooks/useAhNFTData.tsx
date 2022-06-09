import { formatAmount, WRAPPED_SOL_MINT } from '@oyster/common'
import currency from 'currency.js'
import { useEffect, useState } from 'react'
import { useAuctionStatus } from '../components/AuctionRenderCard/hooks/useAuctionStatus'
import { useAllSplPrices, useSolPrice } from '../contexts'
import { useTokenList } from '../contexts/tokenList'
import { useExtendedArt } from './useArt'
import { useAuctionCountdown } from './useAuctionCountdown'
import { AuctionView } from './useAuctions'

const useAhNFTData = (sale: any) => {
  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined)
  const id = sale?.metadata?.pubkey

  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == sale.metadata.info.tokenMint
  )[0]
  const amount = sale?.sale_price
  const { data } = useExtendedArt(id)

  let solVal = `${amount}`
  if (amount >= 1) {
    solVal = formatAmount(amount)
  }

  const solPrice = useSolPrice()
  const altSplPrice = useAllSplPrices().filter(a => a.tokenMint == tokenInfo?.address)[0]
    ?.tokenPrice
  const tokenPrice = tokenInfo?.address == WRAPPED_SOL_MINT.toBase58() ? solPrice : altSplPrice

  useEffect(() => {
    setPriceUSD(solPrice * amount)
  }, [amount, tokenPrice, altSplPrice])

  const usdValFormatted = currency(priceUSD || 0).format()
  const priceNaN = isNaN(amount)

  return {
    data: data,
    value: { usdValFormatted, usdVal: priceUSD, solVal, priceNaN },
  }
}

export default useAhNFTData
