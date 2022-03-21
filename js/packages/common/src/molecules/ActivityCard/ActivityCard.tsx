import React, { FC } from 'react'
import CN from 'classnames'
import { Image } from '../../atoms/Image'

export interface ActivityCardProps {
  [x: string]: any
  image?: string
  title?: string
  description?: string
  price?: string
  fromAddress?: string
  toAddress?: string
  time?: string
}

export const ActivityCard: FC<ActivityCardProps> = ({
  className,
  image,
  title,
  description,
  price,
  fromAddress,
  toAddress,
  time,
  ...restProps
}: ActivityCardProps) => {
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
        <span className='font-500'>{title}</span>
      </div>
      <span>{description}</span>
      <span>{price}</span>
      <span>{fromAddress}</span>
      <span>{toAddress}</span>
      <span>{time}</span>
    </div>
  )
}

ActivityCard.defaultProps = {}

export default ActivityCard
