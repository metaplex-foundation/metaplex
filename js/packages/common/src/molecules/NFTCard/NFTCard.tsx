import React, { FC } from 'react'
import CN from 'classnames'
import { Tag, Image } from '../../atoms'
import { SOLIcon } from '../../icons'

export interface NFTCardProps {
  [x: string]: any
  image?: string
  title?: string
  price?: string
  dollarValue?: string
  bidPrice?: string
}

export const NFTCard: FC<NFTCardProps> = ({
  className,
  image,
  title,
  price,
  dollarValue,
  bidPrice,
  ...restProps
}: NFTCardProps) => {
  const NFTCardClasses = CN(
    `nft-card shadow-card flex flex-col bg-white rounded overflow-hidden w-full group cursor-pointer relative`,
    className
  )

  return (
    <div className={NFTCardClasses} {...restProps}>
      <div className='relative flex h-[180px] w-full overflow-hidden'>
        <Image src={image} />
      </div>

      <div className='flex flex-col justify-between gap-[8px] rounded-b px-[16px] pt-[16px] pb-[20px] transition-all'>
        <h2 className='text-h6'>{title}</h2>
        <div className='flex flex-col gap-[8px]'>
          <div className='font-600 flex items-center gap-[8px] text-base'>
            <span className='flex items-center gap-[4px]'>
              <SOLIcon size={16} className='inline-flex' />
              <span className='flex items-center'>{price}</span>
            </span>
            <span className='font-500 text-sm text-slate-500'>{dollarValue}</span>
          </div>

          <div className='flex'>
            <Tag onClick={() => {}} className='border border-slate-100'>
              <div className='flex items-center gap-[4px]'>
                <span className='flex items-center text-sm'>Bid</span>
                <span className='flex items-center gap-[4px] text-sm'>
                  <SOLIcon size={12} className='inline-flex' />
                  <span>{bidPrice}</span>
                </span>
              </div>
            </Tag>
          </div>
        </div>
      </div>
    </div>
  )
}

NFTCard.defaultProps = {}

export default NFTCard
