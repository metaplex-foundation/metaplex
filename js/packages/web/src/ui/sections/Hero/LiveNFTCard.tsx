import { BidCard, pubkeyToString } from '@oyster/common'
import { FC, useEffect, useState } from 'react'
import { getProfile } from '../../../api'
import { useAhExtendedArt, useExtendedArt } from '../../../hooks'
import { CollectionView } from '../../../hooks/useCollections'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../../views'

interface LiveNFTCardProps {
  className: string
  onClickButton?: () => void
  hasIndicator?: boolean
  collection: any
}

const LiveNFTCard: FC<LiveNFTCardProps> = ({ collection, ...rest }) => {
  const { data } = useAhExtendedArt(collection?.nfts[0].metadata)

  const nameProp: { name: string } = { name: data?.name ?? '' }
  // const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const [user, setUser] = useState<any>(null)
  //@ts-ignore
  if (data?.collection?.name) {
    //@ts-ignore
    nameProp.name = data?.collection?.name
  }

  // const firstAuction =
  //   auctions.find(auction => {
  //     return auction.thumbnail.metadata.info.collection?.key === pubkeyToString(collection.mint)
  //   }) || null

  useEffect(() => {
    let isMounted = true
    if (!user) {
      const userPubKey = collection?.nfts[0]?.seller_wallet || null
      if (userPubKey) {
        getProfile(userPubKey).then(({ data }) => {
          setUser(data)
        })
        return () => {
          isMounted = false
        }
      }
    }
  }, [collection, user])

  let avatarLabel = ''
  if (collection?.nfts[0]?.seller_wallet && !user) {
    avatarLabel =
      collection?.nfts[0]?.seller_wallet.slice(0, 6) +
      '...' +
      collection?.nfts[0]?.seller_wallet.slice(collection?.nfts[0]?.seller_wallet.length - 6)
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
