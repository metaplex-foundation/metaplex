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
      <p className='font-500 pt-[16px] text-base text-slate-700'>{overline}</p>
      <h3 className='text-h4 text-slate-900'>{heading}</h3>
      <p className='font-400 pt-[8px] text-base text-slate-700'>{description}</p>
    </div>
  )
}

DataCard.defaultProps = {}

export default DataCard
