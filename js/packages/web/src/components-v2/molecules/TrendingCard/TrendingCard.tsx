import React, { FC } from 'react'
import CN from 'classnames'

export interface TrendingCardProps {
  [x: string]: any
  size?: 'sm' | 'md' | 'lg'
}

export const TrendingCard: FC<TrendingCardProps> = ({
  className,
  trendingPercentage,
  image,
  name,
  size,
  ...restProps
}: TrendingCardProps) => {
  const TrendingCardClasses = CN(
    `trending-card flex flex-col overflow-hidden h-full cursor-pointer transition-all`,
    className
  )

  return (
    <div className={TrendingCardClasses} {...restProps}>
      <div className='flex'>
        <img
          src={image}
          alt={name}
          className={CN('w-full rounded-[8px] object-cover object-center', {
            'h-[228px]': size === 'md',
            'h-[330px]': size === 'lg',
          })}
        />
      </div>

      <div className='flex items-center gap-[8px] pt-[12px]'>
        <h3 className='truncate text-base'>{name}</h3>
        <span className='flex-shrink-0 font-600 text-green-500'>{trendingPercentage}</span>
      </div>
    </div>
  )
}

TrendingCard.defaultProps = {
  size: 'md',
}

export default TrendingCard
