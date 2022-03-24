import { NFTCard } from '@oyster/common'
import { FC } from 'react'
import { AuctionView } from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'

interface NFTCardWrapperInterface {
  auction: AuctionView
}

const NFTCardWrapper: FC<NFTCardWrapperInterface> = ({ auction }) => {
  const {
    data,
    value: { solVal, usdValFormatted },
  } = useNFTData(auction)

  return (
    <NFTCard
      image={data?.image ?? ''}
      title={data?.name ?? ''}
      price={solVal ?? ''}
      dollarValue={usdValFormatted ?? ''}
      bidPrice='3.12 SOL'
    />
  )
}

export default NFTCardWrapper
