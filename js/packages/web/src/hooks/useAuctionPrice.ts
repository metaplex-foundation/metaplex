import { fromLamports } from '@oyster/common'
import { AuctionView } from './useAuctions'

const useAuctionPrice = ({ auctionView }: { auctionView: AuctionView }) => {
  //   const state = useAuctionCountdown(auctionView)
  //   const bids = useBidsForAuction(auctionView.auction.pubkey)
  //   const mintInfo = useMint(auctionView.auction.info.tokenMint)

  const participationFixedPrice = auctionView.auctionManager.participationConfig?.fixedPrice || 0
  const participationOnly = auctionView.auctionManager.numWinners.toNumber() === 0
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0
  //   const isUpcoming = auctionView.state === AuctionViewState.Upcoming
  //   const isStarted = auctionView.state === AuctionViewState.Live

  //   const tokenInfo = useTokenList().subscribedTokens.filter(
  //     m => m.address == auctionView.auction.info.tokenMint
  //   )[0]
  //   const ended = isEnded(state)

  return {
    price: fromLamports(participationOnly ? participationFixedPrice : priceFloor, mintInfo),
  }
}

export default useAuctionPrice
