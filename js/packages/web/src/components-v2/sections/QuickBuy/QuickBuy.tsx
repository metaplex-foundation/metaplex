import React, { FC } from 'react'
import CN from 'classnames'
import { ItemCard } from '../../molecules/ItemCard'

export interface QuickBuyProps {
  [x: string]: any
}

export const QuickBuy: FC<QuickBuyProps> = ({
  className,
  art,
  onSubmit,
  ...restProps
}: QuickBuyProps) => {
  const QuickBuyClasses = CN(`quick-buy w-full pt-[20px] flex flex-col`, className)
  const { image, name, price } = art || {}

  const itemDetails = {
    image: image,
    isVerified: true,
    collection: 'Belugies',
    name: name,
    royalties: '2.5%',
    price: price,
    dollarValue: '$103.31',
  }

  return (
    <div className={QuickBuyClasses} {...restProps}>
      <div className='mb-[16px] flex w-full justify-between border-b border-gray-100 pb-[8px] text-base font-500'>
        <span>Item</span>
        <span>Price</span>
      </div>

      <div className='mb-[16px] flex max-h-[208px] w-full flex-col gap-[16px] overflow-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300'>
        <ItemCard {...itemDetails} />

        <span className='flex items-center justify-center gap-[4px] rounded-full bg-red-50 px-[20px] py-[4px] text-center text-sm font-500 text-red-500'>
          <i className='ri-error-warning-fill text-base' />
          <span>Insufficient balance</span>
        </span>
      </div>

      <div className='flex w-full items-center justify-between border-t border-gray-100 pt-[12px] font-500 text-gray-800'>
        <span className='text-h6'>You pay</span>
        <span className='text-lg'>◎ .09</span>
      </div>

      <div className='flex justify-center pt-[20px]'>
        <button
          className='h-[52px] w-full max-w-[220px] appearance-none rounded-full bg-B-400 px-[24px] text-base font-500 text-white hover:bg-B-500'
          onClick={onSubmit}>
          Confirm checkout
        </button>
      </div>
    </div>
  )
}

export default QuickBuy
