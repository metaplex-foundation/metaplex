import React, { FC } from 'react'
import CN from 'classnames'
import { Tag } from '../../atoms'
import { SOLIcon } from '../../icons'

export interface AttributesCardProps {
  [x: string]: any
  label?: string
  description?: string
  tagIcon?: any
  tagValue?: any
  overline?: string
  hasHoverEffect?: boolean
  value?: string
}

export const AttributesCard: FC<AttributesCardProps> = ({
  className,
  label,
  description,
  tagIcon,
  tagValue,
  addToFilter,
  overline,
  hasHoverEffect,
  value,
  ...restProps
}) => {
  const AttributesCardClasses = CN(
    `attributes-card flex items-start w-full flex-shrink-0 bg-white border border-slate-200 rounded-[8px] py-[16px] px-[20px] hover:bg-slate-50 transition-all cursor-pointer group relative overflow-hidden transition-all`,
    className
  )
  console.log("-----tag-----", tagIcon)
  return (
    <div className={AttributesCardClasses} {...restProps}>
      <div className='flex flex-col gap-[4px]'>
        {overline && <span className='flex text-sm text-slate-500'>{overline}</span>}

        {label && <span className='label text-h6 w-full'>{label}</span>}

        {description && (
          <div className='flex items-center gap-[4px] text-sm'>
            <span>Floor:</span>
            <div className='flex items-center gap-[4px]'>
              <SOLIcon size={12} />
              <span>{description}</span>
            </div>
          </div>
        )}

        {value && <span className='text-md'>{value}</span>}
      </div>
          
      {tagIcon && <Tag className='ml-auto w-[80px] text-xs' children={tagIcon} iconAfter={tagValue}/>}

      {hasHoverEffect && (
        <div
          onClick={addToFilter}
          className='bg-gradient-primary absolute top-0 right-0 bottom-0 left-0 hidden flex-col  items-center justify-center text-white transition-all group-hover:flex'>
          <i className='ri-add-circle-fill text-[20px]' />
          <span className='font-600 text-xs uppercase'>Add to filter</span>
        </div>
      )}
    </div>
  )
}

AttributesCard.defaultProps = {}

export default AttributesCard
