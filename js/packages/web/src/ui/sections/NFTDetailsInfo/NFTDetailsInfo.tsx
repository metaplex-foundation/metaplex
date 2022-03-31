import React, { FC } from 'react'
import CN from 'classnames'
import { AuctionView } from '../../../hooks'

export interface NFTDetailsInfoProps {
  auction: AuctionView
}

export const NFTDetailsInfo: FC<NFTDetailsInfoProps> = ({ auction }) => {
  const NFTDetailsInfoClasses = CN(`nft-details-info w-full`)
  // console.log('auction', auction)

  return (
    <div className={NFTDetailsInfoClasses}>
      <div className='grid w-full grid-cols-1 gap-[4px]'>
        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Mint address</label>
          <span>6gr...Vun5</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Token address</label>
          <span>6gr...Vun5</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Owner</label>
          <span>6gr...Vun5</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Artist royalties</label>
          <span>12.5%</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Transaction fee</label>
          <span>2%</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Listing / Bidding / Cancel</label>
          <span>Free</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Moonrank</label>
          <span>5711</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>HowRare.is</label>
          <span>5917</span>
        </div>
      </div>
    </div>
  )
}

NFTDetailsInfo.defaultProps = {}

export default NFTDetailsInfo
