import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { AuctionView } from '../../../hooks'
import NFTCardWrapper from './NFTCardWrapper'

export interface CollectionNftListProps {
  auctions: AuctionView[]
}

export const CollectionNftList: FC<CollectionNftListProps> = ({ auctions }) => {
  return (
    <div className='collection-nft-list grid grid-cols-4 gap-[28px]'>
      {auctions.map((auction, key) => (
        <Link to={`/nft/${auction.auction.pubkey}`} key={key}>
          <NFTCardWrapper auction={auction} />
        </Link>
      ))}
    </div>
  )
}
