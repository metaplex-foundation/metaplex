import { BidCard, pubkeyToString } from '@oyster/common'
import { FC, useEffect, useState } from 'react'
import { getProfile } from '../../../api'
import { useExtendedArt } from '../../../hooks'
import { CollectionView } from '../../../hooks/useCollections'
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
  const [user, setUser] = useState<any>(null)
  //@ts-ignore
  if (data?.collection?.name) {
    //@ts-ignore
    nameProp.name = data?.collection?.name
  }

  const firstAuction =
    auctions.find(auction => {
      return auction.thumbnail.metadata.info.collection?.key === pubkeyToString(collection.mint)
    }) || null

  useEffect(() => {
    if (!user) {
      const userPubKey = firstAuction?.auctionManager?.authority || null
      if (userPubKey) {
        getProfile(userPubKey).then(({ data }) => {
          setUser(data)
        })
      }
    }
  }, [firstAuction, user])

  let avatarLabel = ''
  if (firstAuction?.auctionManager?.authority && !user) {
    avatarLabel =
      firstAuction?.auctionManager?.authority.slice(0, 6) +
      '...' +
      firstAuction?.auctionManager?.authority.slice(
        firstAuction?.auctionManager?.authority.length - 6
      )
  } else if (user) {
    avatarLabel = user.user_name
  }
  return (
    <BidCard
      {...rest}
      {...nameProp}
      avatar={user?.image ?? ''}
      avatarLabel={avatarLabel}
      image={data?.image ?? ''}
      onClickButton={() => {}}
      // remainingTime={`${remainingHours}h : ${remainingMinutes}m : ${remainingSeconds}s`}
      // price={!priceNaN ? `Ⓞ ${solVal} SOL` : ''}
      // dollarValue={usdValFormatted}
    />
  )
}

export default LiveNFTCard
