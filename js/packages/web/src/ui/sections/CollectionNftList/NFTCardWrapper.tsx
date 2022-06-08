import { NFTCard } from '@oyster/common'
import { FC, useState } from 'react'
import { AuctionView, useAhExtendedArt } from '../../../hooks'
import { Modal } from '@oyster/common'
import { QuickBuy } from '../QuickBuy'
import { AhQuickBuy } from '../AhQuickBuy'

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
  listing,
  link,
  ...restProps
}) => {
  debugger
  const [showQuickBuy, setShowQuickBuy] = useState(false)
  const { data } = useAhExtendedArt(listing?.metadata)
  console.log('data', data)
  debugger
  if (!!data) {
    return (
      <>
        <NFTCard
          // @ts-ignore
          image={data.image ?? ''}
          // @ts-ignore
          title={data.name ?? ''}
          // @ts-ignore
          price={listing?.seller_price}
          // @ts-ignore
          dollarValue={listing?.seller_price?.formattedUsdAmount ?? ''}
          bidPrice={listing?.seller_price}
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
          <Modal
            onClose={() => setShowQuickBuy(false)}
            onClickOverlay={() => setShowQuickBuy(false)}>
            <AhQuickBuy auction={listing} />
          </Modal>
        )}
      </>
    )
  }
  return <></>
}
