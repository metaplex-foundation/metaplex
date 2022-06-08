import React, { FC } from 'react'
import CN from 'classnames'
import { AttributesCard, Image, Tag, Button, SOLIcon } from '@oyster/common'
import {
  AuctionView,
  useBidsForAuction,
  useCreators,
  useExtendedArt,
  useArt,
  useAhExtendedArt,
} from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'
import { AhAuctionCard, AuctionCard } from '../../../components/AuctionCard'
import { useCollections } from '../../../hooks/useCollections'
import useAttribute from '../../../hooks/useAttribute'
import useAhNFTData from '../../../hooks/useAhNFTData'

export interface QuickBuyProps {
  auction: any
}

export const AhQuickBuy: FC<QuickBuyProps> = ({ auction }: QuickBuyProps) => {
  const QuickBuyClasses = CN(`quick-buy flex flex-col gap-[32px]`)
  const { data } = useAhExtendedArt(auction?.metadata)
  const {
    value: { solVal, usdValFormatted },
  } = useAhNFTData(auction)
  const url = data?.image
  const { data: collection } = useAhExtendedArt(auction?.metadata)
  // const { attributesPercentages } = useAttribute(auction)
  const art = useArt(auction.metadata.pubkey)

  console.log('auction', auction)
  console.log('Quick Buy', data)

  return (
    <div className={QuickBuyClasses} /*{...restProps}*/>
      <div className='flex gap-[32px]'>
        <span className='h-[320px] w-[320px] overflow-hidden rounded-[8px]'>
          <Image src={url} />
        </span>

        <div className='flex flex-col gap-[28px]'>
          <div className='flex flex-col gap-[20px]'>
            <div className='flex flex-col gap-[4px]'>
              <h2 className='text-h2 font-500 text-slate-800'>{data?.name ?? ''}</h2>
              <div className='flex items-center gap-[4px]'>
                <h6 className='text-h6 font-500'>
                  {' '}
                  {
                    //@ts-ignore
                    collection?.name ?? data?.collection?.name
                  }
                </h6>
                <i className='ri-checkbox-circle-fill text-[24px] text-green-400' />
              </div>

              <div className='flex items-center gap-[8px]'>
                <span className='text-md font-500'>Royalties</span>
                <Tag>{((art.seller_fee_basis_points || 0) / 100).toFixed(2)}%</Tag>
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-[8px]'>
            <h5 className='text-h6 font-500'>Current price</h5>
            <div className='flex items-center gap-[8px]'>
              <SOLIcon size={24} />
              <h4 className='text-h4 font-600 leading-[1]'>{auction?.sale_price ?? ''} SOL</h4>
              <span className='ml-[4px] text-lg text-slate-500'>{usdValFormatted ?? ''}</span>
            </div>
          </div>
          {auction && <AhAuctionCard sale={auction} hideDefaultAction={false} />}
        </div>
      </div>
    </div>
  )
}

AhQuickBuy.defaultProps = {}

export default AhQuickBuy
