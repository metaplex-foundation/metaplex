import React, { FC, useState } from 'react'
import { AuctionView } from '../../../hooks'
import NFTCardWrapper from './NFTCardWrapper'
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
        {auctions.map((auction, key) => (
          <NFTCardWrapper
            key={key}
            auction={auction}
            link={`/nft/${auction.auction.pubkey}`}
            onClickQuickBuy={() => setShowQuickBuy(true)}
          />
        ))}
      </div>

      {showQuickBuy && (
        <Modal onClose={() => setShowQuickBuy(false)} onClickOverlay={() => setShowQuickBuy(false)}>
          <QuickBuy />
        </Modal>
      )}
    </>
  )
}
