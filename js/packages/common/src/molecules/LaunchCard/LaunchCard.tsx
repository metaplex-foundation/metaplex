import React, { FC } from 'react'
import CN from 'classnames'
import { Image, MetaChip } from '../../atoms'

export interface LaunchCardProps {
  [x: string]: any
  name?: string
  image?: string
  price?: string
  dollarValue?: string
  onClickButton?: any
  isSmall?: boolean
  remainingTime?: string
}

export const LaunchCard: FC<LaunchCardProps> = ({
  className,
  name,
  image,
  price,
  dollarValue,
  remainingTime,
  ...restProps
}: LaunchCardProps) => {
  const LaunchCardClasses = CN(
    `launch-card flex flex-col bg-white rounded overflow-hidden group transition-all cursor-pointer shadow-card`,
    className
  )

  return (
    <div className={LaunchCardClasses} {...restProps}>
      <div className='flex h-[286px] w-full overflow-hidden transition-all'>
        <Image src={image} />
      </div>

      <div className='flex flex-col rounded-b px-[20px] py-[16px] transition-all'>
        <div className='border-b border-slate-100'>
          <h2 className='text-h5 w-full pb-[16px] text-center'>{name || 'Collection'}</h2>
        </div>

        <div className='flex justify-between pt-[20px]'>
          <div className='flex flex-col gap-[8px]'>
            <MetaChip
              overline='Launching in'
              subHeading={remainingTime}
              align='left'
              commonClassName='!text-gray-700 '
            />
          </div>

          <div className='flex'>
            <MetaChip align='right' overline='Price' subHeading={price} hint={dollarValue} />
          </div>
        </div>
      </div>
    </div>
  )
}

LaunchCard.defaultProps = {
  hasButton: true,
}

export default LaunchCard
