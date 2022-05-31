import React, { FC } from 'react'
import CN from 'classnames'
import { Image } from '../../atoms/Image'
import moment from 'moment'

export interface ActivityCardCollectionProps {
  [x: string]: any
  image?: string
  title?: string
  description?: string
  price?: string
  fromAddress?: string
  toAddress?: string
  time?: string
}

export const ActivityCardCollection: FC<ActivityCardCollectionProps> = ({
  className,
  image,
  title,
  description,
  price,
  fromAddress,
  toAddress,
  time,
  ...restProps
}: ActivityCardCollectionProps) => {
  const ActivityCardClasses = CN(
    `activity-card border flex items-center py-[4px] px-[4px] w-full rounded-[8px] border-slate-200 text-md grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-[8px] text-center bg-white hover:bg-slate-50 cursor-pointer`,
    className
  )

  return (
    <div className={ActivityCardClasses} {...restProps}>
      <div className='flex items-center gap-[8px]'>
        <div className='flex h-[40px] w-[40px] overflow-hidden rounded-[8px]'>
          <Image src={image} />
        </div>
        <span className='font-500'>{description}</span>
      </div>
      <span className='customCardItem'>Sales</span>
      <span>{price}</span>
      <span className='customCardItem'>{fromAddress}</span>
      <span className='customCardItem'>{toAddress}</span>
      <span className='customCardItem'>{moment(time).fromNow()}</span>
    </div>
  )
}

ActivityCardCollection.defaultProps = {}

export default ActivityCardCollection
