import React, { FC } from 'react'
import CN from 'classnames'

export interface StatsCardProps {
  [x: string]: any
}

export const StatChip = ({ label, value, hasCurrency, className }: any) => {
  return (
    <div
      className={CN(
        'flex flex-shrink-0 flex-col justify-center border-gray-200 px-[24px] text-center',
        className
      )}>
      <label className='flex w-full items-center justify-center gap-[4px] text-center text-lg font-600 text-gray-800'>
        {hasCurrency && '◎'} {value}
      </label>
      <span className='flex w-full justify-center text-center text-gray-700'>{label}</span>
    </div>
  )
}

export const StatsCard: FC<StatsCardProps> = ({ className, ...restProps }: StatsCardProps) => {
  const StatsCardClasses = CN(
    `stats-card grid w-full grid-cols-2 md:flex py-[32px] bg-gray-50 flex-shrink-0 rounded-[8px] px-[12px] justify-center`,
    className
  )

  return (
    <div className={StatsCardClasses} {...restProps}>
      <StatChip className='pb-[16px] md:pb-0 border-r' label='Items' value='8k' />
      <StatChip className='pb-[16px] md:pb-0 md:border-r' label='Owners' value='3.2k' />
      <StatChip className='pt-[16px] md:pt-0 border-t md:border-t-0 border-r' label='Floor price' value='0.35' hasCurrency />
      <StatChip className='pt-[16px] md:pt-0 border-t md:border-t-0' label='Total volume' value='8.2k' hasCurrency />
    </div>
  )
}

export default StatsCard
