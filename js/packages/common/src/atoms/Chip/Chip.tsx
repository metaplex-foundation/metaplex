import React, { FC } from 'react'
import CN from 'classnames'
import { Tag } from '../Tag'

export interface ChipProps {
  [x: string]: any
  label?: string
  tag?: string
  icon?: any
}

export const Chip: FC<ChipProps> = ({ className, label, tag, icon, ...restProps }: ChipProps) => {
  const ChipClasses = CN(
    `chip flex items-center w-full flex-shrink-0 bg-white border border-slate-200 rounded-[8px] py-[8px] pl-[20px] pr-[8px] hover:bg-slate-50 transition-all cursor-pointer`,
    className
  )

  return (
    <div className={ChipClasses} {...restProps}>
      <span className='label text-md font-500 w-full'>{label}</span>
      <div className='flex items-center gap-[8px]'>
        <Tag className='w-[40px] justify-center'>{tag}</Tag>

        {icon && <span className='icon'>{icon}</span>}
        {!icon && <i className='ri-arrow-right-s-line text-[24px] text-slate-900' />}
      </div>
    </div>
  )
}

Chip.defaultProps = {}

export default Chip
