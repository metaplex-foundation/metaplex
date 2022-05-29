import { NFTCard } from '@oyster/common'
import { FC, useState } from 'react'
import { AuctionView } from '../../../hooks'
import { Modal } from '@oyster/common'
import { QuickBuy } from '../QuickBuy'

interface NFTCardWrapperInterface {
  [key: string]: any
  auction: AuctionView
  link?: string
}

export const NFTCardWrapper: FC<NFTCardWrapperInterface> = ({ auction, link, ...restProps }) => {
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  return (
    <>
      <NFTCard
        // @ts-ignore
        image={auction.offChainData?.image ?? ''}
        // @ts-ignore
        title={auction.offChainData?.name ?? ''}
        // @ts-ignore
        price={auction?.amounts?.priceFloor ?? ''}
        // @ts-ignore
        dollarValue={auction?.amounts?.formattedUsdAmount ?? ''}
        bidPrice='3.12 SOL'
        onClickDetails={() => {
          console.log('On click details')
          setShowQuickBuy(true)
        }}
        onQuickBuy={() => {
          console.log('On click details')
          setShowQuickBuy(true)
        }}
        link={link ?? ''}
        {...restProps}
      />
      {showQuickBuy && (
        <Modal onClose={() => setShowQuickBuy(false)} onClickOverlay={() => setShowQuickBuy(false)}>
          <QuickBuy auction={auction} />
        </Modal>
      )}
    </>
  )
}

interface AuctionHouseNFTCardWrapperInterface {
  [key: string]: any
  listing: any
  link?: string
}

export const AuctionHouseNFTCardWrapper: FC<AuctionHouseNFTCardWrapperInterface> = ({
  auction,
  link,
  ...restProps
}) => {
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  return (
    <>
      <NFTCard
        // @ts-ignore
        image={auction.offChainData?.image ?? ''}
        // @ts-ignore
        title={auction.offChainData?.name ?? ''}
        // @ts-ignore
        price={auction?.amounts?.priceFloor ?? ''}
        // @ts-ignore
        dollarValue={auction?.amounts?.formattedUsdAmount ?? ''}
        bidPrice='3.12 SOL'
        onClickDetails={() => {
          console.log('On click details')
          setShowQuickBuy(true)
        }}
        onQuickBuy={() => {
          console.log('On click details')
          setShowQuickBuy(true)
        }}
        link={link ?? ''}
        {...restProps}
      />
      {showQuickBuy && (
        <Modal onClose={() => setShowQuickBuy(false)} onClickOverlay={() => setShowQuickBuy(false)}>
          <QuickBuy auction={auction} />
        </Modal>
      )}
    </>
  )
}
