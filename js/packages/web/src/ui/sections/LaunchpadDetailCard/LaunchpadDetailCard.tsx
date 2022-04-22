import React, { FC } from 'react'
import CN from 'classnames'

export interface LaunchpadDetailCardProps {
  [x: string]: any
  price?: string
  priceInDollars?: string
  launchTime?: string
}

export const LaunchpadDetailCard: FC<LaunchpadDetailCardProps> = ({
  className,
  price,
  priceInDollars,
  launchTime,
  ...restProps
}: LaunchpadDetailCardProps) => {
  const LaunchpadDetailCardClasses = CN(
    `launchpad-detail-card max-w-[564px] rounded-[8px] border border-gray-200 bg-white shadow-card-light`,
    className
  )

  return (
    <div className={LaunchpadDetailCardClasses} {...restProps}>
      <div className='flex justify-between px-[20px] py-[20px]'>
        <div className='flex flex-col items-start gap-[0]'>
          <p className='text-base font-500 text-gray-800'>Price</p>

          <div className='flex items-center gap-[12px]'>
            <h5 className='text-h4 font-600 text-gray-800'>{price}</h5>
            <h6 className='text-h5 font-500 text-gray-500'>{priceInDollars}</h6>
          </div>
        </div>

        <div className='flex flex-col items-end gap-[0]'>
          <p className='text-base font-500 text-gray-800'>Launching in</p>
          <h5 className='text-h4 font-600 text-gray-800'>{launchTime}</h5>
        </div>
      </div>
    </div>
  )
}

LaunchpadDetailCard.defaultProps = {}

export default LaunchpadDetailCard
