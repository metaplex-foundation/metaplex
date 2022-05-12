import { BidCard, Collection, pubkeyToString } from '@oyster/common'
import { FC } from 'react'
import { AuctionView, useExtendedArt } from '../../../hooks'
import { CollectionView } from '../../../hooks/useCollections'
import useNFTData from '../../../hooks/useNFTData'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../../views'

interface LiveNFTCardProps {
  className: string
  onClickButton?: () => void
  hasIndicator?: boolean
  collection: CollectionView
}

const LiveNFTCard: FC<LiveNFTCardProps> = ({ collection, ...rest }) => {
  const { data } = useExtendedArt(collection.pubkey)

  const nameProp: { name: string } = { name: data?.name ?? '' }
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  //@ts-ignore
  if (data?.collection?.name) {
    //@ts-ignore
    nameProp.name = data?.collection?.name
  }

  const firstAuction =
    auctions.find(auction => {
      return auction.thumbnail.metadata.info.collection?.key === pubkeyToString(collection.mint)
    }) || null

  let avatarLabel = ''
  if (firstAuction?.auctionManager?.authority) {
    avatarLabel =
      firstAuction?.auctionManager?.authority.slice(0, 6) +
      '...' +
      firstAuction?.auctionManager?.authority.slice(
        firstAuction?.auctionManager?.authority.length - 6
      )
  }
  return (
    <BidCard
      {...rest}
      avatar='https://images.unsplash.com/photo-1511485977113-f34c92461ad9?crop=faces&fit=crop&h=200&w=200'
      avatarLabel={avatarLabel}
      image={data?.image ?? ''}
      // remainingTime={`${remainingHours}h : ${remainingMinutes}m : ${remainingSeconds}s`}
      // price={!priceNaN ? `Ⓞ ${solVal} SOL` : ''}
      // dollarValue={usdValFormatted}
    />
  )
}

export default LiveNFTCard
