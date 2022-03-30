import React, { FC } from 'react'
import CN from 'classnames'

export interface NFTDetailsActivityProps {
  [x: string]: any
}

const activity = [
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
  {
    type: 'Sale',
    price: '1.25',
    from: '6grFa...Vun5',
    to: '7hk...JaoW',
    time: '12 hours ago',
  },
]

export const NFTDetailsActivity: FC<NFTDetailsActivityProps> = ({
  className,
  ...restProps
}: NFTDetailsActivityProps) => {
  const NFTDetailsActivityClasses = CN(`nft-details-activity w-full`, className)

  return (
    <div className={NFTDetailsActivityClasses} {...restProps}>
      <div className='grid grid-cols-5 px-[8px] pb-[8px] text-md font-500 text-slate-500 mb-[4px]'>
        <div className='grid-cell'>Type</div>
        <div className='grid-cell'>Price</div>
        <div className='grid-cell'>From</div>
        <div className='grid-cell'>To</div>
        <div className='grid-cell'>Time</div>
      </div>

      <div className='flex flex-col gap-[4px]'>
        {activity.map(({ type, from, to, time, price }: any, index: number) => (
          <div
            className='grid grid-cols-5 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md font-400 text-slate-800 shadow-card'
            key={index}>
            <div className='grid-cell'>{type}</div>
            <div className='grid-cell'>{price}</div>
            <div className='grid-cell'>{from}</div>
            <div className='grid-cell'>{to}</div>
            <div className='grid-cell'>{time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

NFTDetailsActivity.defaultProps = {}

export default NFTDetailsActivity
