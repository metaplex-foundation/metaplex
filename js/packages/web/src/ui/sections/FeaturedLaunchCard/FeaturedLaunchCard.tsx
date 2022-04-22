import React, { FC } from 'react'
import CN from 'classnames'
import { Button, Badge } from '@oyster/common'

export interface FeaturedLaunchCardProps {
  [x: string]: any
  heading?: string
  description?: string
  tagText?: string
  image?: string
  onClickButton?: any
}

export const FeaturedLaunchCard: FC<FeaturedLaunchCardProps> = ({
  className,
  heading,
  description,
  tagText,
  image,
  onClickButton,
  ...restProps
}: FeaturedLaunchCardProps) => {
  const FeaturedLaunchCardClasses = CN(
    `featured-launch-card flex h-[452px] justify-between bg-white px-[60px] py-[60px] shadow-card rounded-[12px]`,
    className
  )

  return (
    <div className={FeaturedLaunchCardClasses} {...restProps}>
      <div className='max-w-[476px]'>
        <div className='max-w-[148px] pb-[20px]'>
          <Badge appearance='success' view='outline'>
            {tagText}
          </Badge>
        </div>
        <h1 className='pb-[8px] text-h1 font-500 text-gray-900'>{heading}</h1>
        <p className='pb-[40px] text-base font-400 text-gray-800'>{description}</p>
        <Button
          appearance='primary'
          size='lg'
          className='w-[284px] rounded-[8px]'
          onClick={onClickButton}>
          Go to Launch
        </Button>
      </div>
      <img src={image} className='rounded-[12px] object-cover' />
    </div>
  )
}

FeaturedLaunchCard.defaultProps = {}

export default FeaturedLaunchCard
