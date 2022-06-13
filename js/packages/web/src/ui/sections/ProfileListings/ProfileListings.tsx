import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { ListingCard, pubkeyToString, toPublicKey } from '@oyster/common'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'
import { useWallet } from '@solana/wallet-adapter-react'
import { AuctionView, useAhExtendedArt, useExtendedArt } from '../../../hooks'
import { Link, useParams } from 'react-router-dom'
import useNFTData from '../../../hooks/useNFTData'
import { getListingsBySeller } from '../../../api/ahListingApi'
import useAhNFTData from '../../../hooks/useAhNFTData'

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

const AhNFTCardWrapper: FC<any> = ({ nft }) => {
  const pubkey = nft.metadata.pubkey
  const id = pubkeyToString(pubkey)
  const { data } = useAhExtendedArt(nft.metadata)
  const {
    value: { priceNaN, solVal, usdValFormatted },
  } = useAhNFTData(nft)
  const image = data?.image || ''
  const name = data?.name || ''

  return (
    <Link to={`/nft/${nft.mint}`}>
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
  setTag,
  ...restProps
}: ProfileListingsProps) => {
  const ProfileListingsClasses = CN(`profile-listings grid grid-cols-4 gap-[28px]`, className)

  const [userAuctions, setUserAuctions] = useState<AuctionView[]>([])
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const [ahListings, setAhListings] = useState<any>()
  const wallet = useWallet()
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    if (auctions.length) {
      const data = auctions.filter(auction => {
        if (id) {
          return auction.auctionManager.authority === toPublicKey(id).toBase58()
        }
        return auction.auctionManager.authority === wallet.publicKey?.toBase58()
      })
      setUserAuctions([...data])
    }
  }, [auctions, wallet, id])

  useEffect(() => {
    setTag(`${userAuctions.length} NFTs`)
  }, [userAuctions])

  useEffect(() => {
    const fetchData = async () => {
      const ahList = await getListingsBySeller(wallet.publicKey?.toBase58())
      debugger
      setAhListings(ahList)
    }
    fetchData().catch(console.error)
  }, [wallet.publicKey])

  return (
    <div className={ProfileListingsClasses} {...restProps}>
      {userAuctions.map((auction, key) => (
        <NFTCardWrapper key={key} nft={auction} />
      ))}
      {!!ahListings && ahListings.map(sale => <AhNFTCardWrapper key={sale.id} nft={sale} />)}
    </div>
  )
}

ProfileListings.defaultProps = {}

export default ProfileListings
