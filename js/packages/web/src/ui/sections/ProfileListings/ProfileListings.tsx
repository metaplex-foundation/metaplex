import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { ListingCard, pubkeyToString } from '@oyster/common'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'
import { useWallet } from '@solana/wallet-adapter-react'
import { AuctionView, useExtendedArt } from '../../../hooks'
import { Link } from 'react-router-dom'
import useNFTData from '../../../hooks/useNFTData'

export interface ProfileListingsProps {
  [x: string]: any
}

interface NFTCardWrapperProps {
  nft: AuctionView
}

const NFTCardWrapper: FC<NFTCardWrapperProps> = ({ nft }) => {
  const pubkey = nft.thumbnail.metadata.pubkey
  const id = pubkeyToString(pubkey)
  const { data } = useExtendedArt(id)
  const {
    value: { priceNaN, solVal, usdValFormatted },
  } = useNFTData(nft)
  const image = data?.image || ''
  const name = data?.name || ''

  return (
    <Link to={`/nft/${nft.auction.pubkey}`}>
      <ListingCard
        image={image}
        name={name}
        count={2000}
        // volume='472.54'
        floorPrice={!priceNaN ? `Ⓞ ${solVal} SOL` : ''}
        dollarValue={usdValFormatted}
      />
    </Link>
  )
}

export const ProfileListings: FC<ProfileListingsProps> = ({
  className,
  ...restProps
}: ProfileListingsProps) => {
  const ProfileListingsClasses = CN(`profile-listings grid grid-cols-4 gap-[28px]`, className)

  const [userAuctions, setUserAuctions] = useState<AuctionView[]>([])
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const wallet = useWallet()

  useEffect(() => {
    if (auctions.length) {
      const data = auctions.filter(auction => {
        return auction.auctionManager.authority === wallet.publicKey?.toBase58()
      })
      setUserAuctions([...data])
    }
  }, [auctions, wallet])
  console.log('userAuctions', userAuctions)

  return (
    <div className={ProfileListingsClasses} {...restProps}>
      {userAuctions.map((auction, key) => (
        <NFTCardWrapper key={key} nft={auction} />
      ))}
    </div>
  )
}

ProfileListings.defaultProps = {}

export default ProfileListings
