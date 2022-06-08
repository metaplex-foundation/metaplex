import React, { FC, useState } from 'react'
import CN from 'classnames'
import { MetaChip } from '../../atoms/MetaChip'
import { Statistic } from 'antd'

export interface StatsCardProps {
  [x: string]: any
  stats?: any[]
}

export const StatsCard: FC<StatsCardProps> = ({
  numberOfItems,
  className,
  owners,
  volumn,
  floorPrice,
  ...restProps
}: StatsCardProps) => {
  const StatsCardClasses = CN(
    `stats-card shadow-card bg-white p-[20px] rounded h-[100px] flex items-center w-full justify-between gap-[32px]`,
    className
  )

  return (
    <div className={StatsCardClasses} {...restProps}>
      <MetaChip className='w-full' align='center' description='Items' heading={numberOfItems} />
      <span className='flex h-[60px] w-[1px] bg-slate-200' />
      <MetaChip
        className='w-full'
        align='center'
        description={`Owners`}
        heading={owners ? owners.length : ''}
      />
      <span className='flex h-[60px] w-[1px] bg-slate-200' />
      <MetaChip className='w-full' align='center' description='Floor price' heading={floorPrice} />
      <span className='flex h-[60px] w-[1px] bg-slate-200' />
      <MetaChip className='w-full' align='center' description='Volume' heading={volumn} />
    </div>
  )
}

StatsCard.defaultProps = {}

export default StatsCard
