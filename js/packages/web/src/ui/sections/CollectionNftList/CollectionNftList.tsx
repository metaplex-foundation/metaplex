import React, { FC } from 'react'
import { AuctionView } from '../../../hooks'
import NFTCardWrapper from './NFTCardWrapper'

export interface CollectionNftListProps {
  auctions: AuctionView[]
}

export const CollectionNftList: FC<CollectionNftListProps> = ({ auctions }) => {
  return (
    <div className='collection-nft-list grid grid-cols-4 gap-[28px]'>
      {auctions.map((auction, key) => (
        <NFTCardWrapper key={key} auction={auction} />
      ))}
    </div>
  )
}
