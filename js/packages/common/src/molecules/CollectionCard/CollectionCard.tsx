import React, { FC } from 'react'
import CN from 'classnames'
import { SOLIcon } from '../../icons'

export interface CollectionCardProps {
  [x: string]: any
  isPositive?: boolean
  image?: string
  rank?: string
  NFTName?: string
  itemCount?: string | number
  marketCap?: any
  volume?: any
  avgPrice?: any
  floorPrice?: any
}

export const CollectionCard: FC<CollectionCardProps> = ({
  className,
  image,
  rank,
  NFTName,
  itemCount,
  marketCap,
  volume,
  avgPrice,
  floorPrice,
  isPositive,
  ...restProps
}: CollectionCardProps) => {
  const CollectionCardClasses = CN(
    `collection-card bg-white rounded-[12px] border border-N-100 pl-[20px] py-[12px] shadow-card-smooth grid grid-cols-[0.25fr_2fr_1fr_1fr_1fr_1fr] items-center`,
    className
  )

  return (
    <div className={CollectionCardClasses} {...restProps}>
      {/* Collection name */}
      <p className='text-md font-500 text-black'>{rank}</p>

      <div className='flex items-center gap-[16px]'>
        <img src={image} className='h-[60px] w-[60px] rounded-full' />
        <div className='flex flex-col gap-[4px]'>
          <p className='text-md font-500 text-black nft-name'>{NFTName}</p>
          <p className='font-500 text-sm text-slate-600'>{itemCount}</p>
        </div>
      </div>

      {/* Market cap */}
      <div className='flex flex-col gap-[4px]'>
        <div className='flex items-center gap-[4px]'>
          <SOLIcon />
          <p className='text-md font-500 text-black'>{marketCap?.amount}</p>
        </div>
        <p className='font-500 text-sm text-slate-600'>{marketCap?.dollarValue}</p>
      </div>

      {/* Volume */}
      <div className='flex flex-col gap-[4px]'>
        <div className='flex items-center gap-[4px]'>
          <SOLIcon />
          <p className='text-md font-500 text-black'>{volume?.volumeAmount}</p>
        </div>
        <p
          className={CN('font-500 text-sm', {
            'text-G-500': volume?.isPositive,
            'text-R-600': !isPositive,
          })}>
          {volume?.volumePercentage}
        </p>
      </div>

      {/* Avg. price (24hrs) */}
      <div className='flex flex-col gap-[4px]'>
        <div className='flex items-center gap-[4px]'>
          <SOLIcon />
          <p className='text-md font-500 text-black'>{avgPrice?.avgSolAmount}</p>
        </div>
        <p className='font-500 text-sm text-slate-600'>{avgPrice?.history}</p>
      </div>

      {/* Floor price */}
      <div className='flex flex-col gap-[4px]'>
        <div className='flex items-center gap-[4px]'>
          <SOLIcon />
          <p className='text-md font-500 text-black'>{floorPrice?.floorSolAmount}</p>
        </div>
        <p className='font-500 text-sm text-slate-600'>{floorPrice?.floorDollarAmount}</p>
      </div>
    </div>
  )
}

CollectionCard.defaultProps = {}

export default CollectionCard
