import React, { FC, useState } from 'react'
import { AuctionView } from '../../../hooks'
import { AuctionHouseNFTCardWrapper, NFTCardWrapper } from './NFTCardWrapper'
import { Modal } from '@oyster/common'
import { QuickBuy } from '../QuickBuy'
import { AhQuickBuy } from '../AhQuickBuy'
import CN from 'classnames'

export interface CollectionNftListProps {
  [x: string]: any
  auctions: AuctionView[]
}

export interface AhCollectionNftListProps {
  [x: string]: any
  listings: any
}

export const CollectionNftList: FC<CollectionNftListProps> = ({ auctions, isSidebarCollapsed }) => {
  const [showQuickBuy, setShowQuickBuy] = useState(false)

  return (
    <>
      <div
        className={CN('collection-nft-list grid gap-[28px]', {
          'grid-cols-5': isSidebarCollapsed,
          'grid-cols-4': !isSidebarCollapsed,
        })}>
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

export const AhCollectionNftList: FC<AhCollectionNftListProps> = ({
  listings,
  isSidebarCollapsed,
}) => {
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  if (!!listings) {
    return (
      <>
        <div
          className={CN('collection-nft-list grid gap-[28px]', {
            'grid-cols-5': isSidebarCollapsed,
            'grid-cols-4': !isSidebarCollapsed,
          })}>
          {listings.map(listing => (
            <AuctionHouseNFTCardWrapper
              key={listing.mint}
              listing={listing}
              link={`/nft/${listing.mint}`}
              onClickQuickBuy={() => setShowQuickBuy(true)}
              testAc={true}
            />
          ))}
          {showQuickBuy && (
            <Modal
              onClose={() => setShowQuickBuy(false)}
              onClickOverlay={() => setShowQuickBuy(false)}>
              <AhQuickBuy auction={listings} />
            </Modal>
          )}
        </div>
      </>
    )
  }
  return <></>
}
