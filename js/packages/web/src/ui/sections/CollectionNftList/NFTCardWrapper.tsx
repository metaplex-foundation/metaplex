import { NFTCard } from '@oyster/common'
import { FC } from 'react'
import { AuctionView } from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'

interface NFTCardWrapperInterface {
  [key: string]: any
  auction: AuctionView
  link?: string
}

const NFTCardWrapper: FC<NFTCardWrapperInterface> = ({ auction, link, ...restProps }) => {
  const {
    data,
    value: { solVal, usdValFormatted },
  } = useNFTData(auction)
  // console.log('data', data)

  return (
    <NFTCard
      image={data?.image ?? ''}
      title={data?.name ?? ''}
      price={solVal ?? ''}
      dollarValue={usdValFormatted ?? ''}
      bidPrice='3.12 SOL'
      onClickQuickBuy={() => {}}
      onClickDetails={() => {}}
      link={link ?? ''}
      {...restProps}
    />
  )
}

export default NFTCardWrapper
