import React, { FC } from 'react'
import CN from 'classnames'
import { SOLIcon, Avatar, formatTokenAmount } from '@oyster/common'
import { AuctionView, useBidsForAuction } from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'

export interface NFTDetailsCurrentOffersProps {
  [x: string]: any
  auction: AuctionView
}

export const NFTDetailsCurrentOffers: FC<NFTDetailsCurrentOffersProps> = ({
  className,
  ...restProps
}: NFTDetailsCurrentOffersProps) => {
  const NFTDetailsCurrentOffersClasses = CN(`nft-details-current-offers w-full`, className)
  const bids = useBidsForAuction(restProps.auction.auction.pubkey || '')

  const {
    remaining: { remainingHours },
  } = useNFTData(restProps.auction)

  return (
    <div className={NFTDetailsCurrentOffersClasses} {...restProps}>
      <div className='mb-[4px] grid grid-cols-4 px-[8px] pb-[8px] text-md font-500 text-slate-500'>
        <div className='grid-cell'>From</div>
        <div className='grid-cell'>Price</div>
        <div className='grid-cell'>Floor difference</div>
        <div className='grid-cell'>Expiration</div>
      </div>

      <div className='flex flex-col gap-[4px]'>
        {bids.map((bid, index) => (
          <div
            className='grid grid-cols-4 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md font-400 text-slate-800 shadow-card'
            key={index}>
            <div className='grid-cell'>
              <Avatar
                size='sm'
                image=''
                label={`${bid.info.bidderPubkey.substring(
                  0,
                  3
                )}...${bid.info.bidderPubkey.substring(bid.info.bidderPubkey.length - 4)}`}
                labelClassName='font-400'
              />
            </div>

            <div className='grid-cell'>
              <span className='flex items-center gap-[4px]'>
                <SOLIcon size={12} />
                <span>{formatTokenAmount(bid.info.lastBid)}</span>
              </span>
            </div>

            {/* <div className='grid-cell'>
                <span className='flex items-center gap-[4px]'>
                  <span></span>

                  {floorDifferenceType === 'above' ? (
                    <i className='ri-arrow-up-line text-[16px] font-400' />
                  ) : (
                    <i className='ri-arrow-down-line text-[16px] font-400' />
                  )}
                </span>
              </div> */}
            <div className='grid-cell'>
              <span className='flex items-center gap-[4px]'></span>
            </div>

            <div className='grid-cell'>{remainingHours}h</div>
          </div>
        ))}
      </div>
    </div>
  )
}

NFTDetailsCurrentOffers.defaultProps = {}

export default NFTDetailsCurrentOffers
