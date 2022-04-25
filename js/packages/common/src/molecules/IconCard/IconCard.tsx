import React, { FC } from 'react'
import CN from 'classnames'

export interface DonationCardProps {
  [x: string]: any
  heading?: string
  description?: string
  icon?: string
}

export const IconCard: FC<DonationCardProps> = ({
  className,
  icon,
  heading,
  description,
  ...restProps
}: DonationCardProps) => {
  const DonationCardClasses = CN(
    `icon-card bg-white w-[286px] shadow-card rounded-[12px] px-[20px] py-[40px] flex flex-col items-center gap-[20px]`,
    className
  )

  return (
    <div className={DonationCardClasses} {...restProps}>
      <img src={icon} className='h-[64px] w-[64px]' />
      <h5 className='text-h5 font-600 text-gray-800'>{heading}</h5>
      <p
        className='max-w-[246px] text-center text-md text-gray-700'
        dangerouslySetInnerHTML={{ __html: description || '' }}
      />
    </div>
  )
}

IconCard.defaultProps = {}

export default IconCard
