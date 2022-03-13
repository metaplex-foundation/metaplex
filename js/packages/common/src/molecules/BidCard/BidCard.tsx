import React, { FC } from 'react'
import CN from 'classnames'
import { Avatar, Tag, Image, Button, MetaChip } from '../../atoms'

export interface BidCardProps {
  [x: string]: any
  avatar?: string
  avatarLabel?: string
  image?: string
  remainingTime?: string
  price?: string
  dollarValue?: string
  onClickButton?: any
  hasIndicator?: boolean
}

export const BidCard: FC<BidCardProps> = ({
  className,
  avatar,
  avatarLabel,
  image,
  remainingTime,
  price,
  dollarValue,
  onClickButton,
  hasIndicator,
  ...restProps
}: BidCardProps) => {
  const BidCardClasses = CN(
    `bid-card flex flex-col gap-[12px] p-[24px] bg-white rounded-[12px] w-full`,
    className
  )

  return (
    <div className={BidCardClasses} {...restProps}>
      <div className='flex items-center justify-between'>
        <Avatar image={avatar} label={avatarLabel} />
        {hasIndicator && (
          <Tag hasIndicator appearance='danger'>
            Live
          </Tag>
        )}
      </div>

      <div className='flex h-[200px] w-full overflow-hidden rounded'>
        <Image src={image} />
      </div>

      <div className='flex justify-between'>
        <div className='flex flex-col gap-[8px]'>
          <MetaChip overline='Remaining Time' subHeading={remainingTime} />
          <Button appearance='neutral' onClick={onClickButton}>
            View collection
          </Button>
        </div>

        <div className='flex'>
          <MetaChip align='right' overline='Starting Bid' subHeading={price} hint={dollarValue} />
        </div>
      </div>
    </div>
  )
}

export default BidCard
