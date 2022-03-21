import React, { FC } from 'react'
import CN from 'classnames'
import { Tag } from '../../atoms'
import { SOLIcon } from '../../icons'

export interface AttributesCardProps {
  [x: string]: any
  label?: string
  description?: string
  tag?: any
}

export const AttributesCard: FC<AttributesCardProps> = ({
  className,
  label,
  description,
  tag,
  ...restProps
}: AttributesCardProps) => {
  const AttributesCardClasses = CN(
    `attributes-card flex items-start w-full flex-shrink-0 bg-white border border-slate-200 rounded-[8px] py-[16px] px-[20px] hover:bg-slate-50 transition-all cursor-pointer group relative overflow-hidden transition-all`,
    className
  )

  return (
    <div className={AttributesCardClasses} {...restProps}>
      <div className='flex flex-col gap-[4px]'>
        <span className='label text-h6 w-full'>{label}</span>
        <div className='flex items-center gap-[4px] text-sm'>
          <span>Floor:</span>
          <div className='flex items-center gap-[4px]'>
            <SOLIcon size={12} />
            <span>{description}</span>
          </div>
        </div>
      </div>

      {tag && <Tag className='ml-auto w-[80px] text-xs'>{tag}</Tag>}

      <div className='bg-gradient-primary absolute top-0 right-0 bottom-0 left-0 hidden flex-col  items-center justify-center text-white transition-all group-hover:flex'>
        <i className='ri-add-circle-fill text-[20px]' />
        <span className='font-600 text-xs uppercase'>Add to filter</span>
      </div>
    </div>
  )
}

AttributesCard.defaultProps = {}

export default AttributesCard
