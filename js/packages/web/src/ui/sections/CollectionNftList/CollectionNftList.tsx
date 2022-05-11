import React, { FC, useState } from 'react'
import { AuctionView } from '../../../hooks'
import { NFTCardWrapper } from './NFTCardWrapper'
import { Modal } from '@oyster/common'
import { QuickBuy } from '../QuickBuy'

export interface CollectionNftListProps {
  auctions: AuctionView[]
}

export const CollectionNftList: FC<CollectionNftListProps> = ({ auctions }) => {
  const [showQuickBuy, setShowQuickBuy] = useState(false)

  return (
    <>
      <div className='collection-nft-list grid grid-cols-4 gap-[28px]'>
        {auctions.map(auction => (
          <NFTCardWrapper
            key={auction.auction.pubkey}
            auction={auction}
            link={`/nft/${auction.auction.pubkey}`}
            onClickQuickBuy={() => setShowQuickBuy(true)}
            testAc={true}
          />
        ))}
        {/* {showQuickBuy && (
          <Modal
            onClose={() => setShowQuickBuy(false)}
            onClickOverlay={() => setShowQuickBuy(false)}>
            <QuickBuy />
          </Modal>
        )} */}
      </div>
    </>
  )
}
