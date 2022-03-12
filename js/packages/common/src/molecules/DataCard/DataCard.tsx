import React, { FC } from 'react'
import CN from 'classnames'

export interface DataCardProps {
  [x: string]: any
  icon?: string
  overline?: string
  heading?: string
  description?: string
}

export const DataCard: FC<DataCardProps> = ({
  className,
  icon,
  overline,
  heading,
  description,
  ...restProps
}: DataCardProps) => {
  const DataCardClasses = CN(`data-card rounded p-[40px] w-full bg-white`, className)

  return (
    <div className={DataCardClasses} {...restProps}>
      <span className='h-[60px] w-auto'>
        <img src={icon} height={60} />
      </span>
      <p className='pt-[16px] text-base font-500 text-N-700'>{overline}</p>
      <h3 className='text-h3 font-700 text-N-800'>{heading}</h3>
      <p className='pt-[8px] text-base font-400 text-N-700'>{description}</p>
    </div>
  )
}

DataCard.defaultProps = {}

export default DataCard
