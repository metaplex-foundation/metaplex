import { NFTCard } from '@oyster/common'
import { FC, useState, useEffect } from 'react'
import { AuctionView } from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'
import { Modal } from '@oyster/common'
import { QuickBuy } from '../QuickBuy'

interface NFTCardWrapperInterface {
  [key: string]: any
  auction: AuctionView
  link?: string
}

export const NFTCardWrapper: FC<NFTCardWrapperInterface> = ({ auction, link, ...restProps }) => {
  const {
    data,
    value: { solVal, usdValFormatted },
  } = useNFTData(auction)

  const [showQuickBuy, setShowQuickBuy] = useState(false)

  return (
    <>
      <NFTCard
        image={data?.image ?? ''}
        title={data?.name ?? ''}
        price={solVal ?? ''}
        dollarValue={usdValFormatted ?? ''}
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
