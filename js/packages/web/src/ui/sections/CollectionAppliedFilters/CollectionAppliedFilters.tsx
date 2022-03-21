import React, { FC } from 'react'
import CN from 'classnames'
import { Tag, Button } from '@oyster/common'

export interface CollectionAppliedFiltersProps {
  [x: string]: any
}

export const CollectionAppliedFilters: FC<CollectionAppliedFiltersProps> = ({
  className,
  ...restProps
}: CollectionAppliedFiltersProps) => {
  const CollectionAppliedFiltersClasses = CN(
    `collection-applied-filters px-[20px] py-[24px] bg-slate-10 border border-slate-200 rounded-[8px] relative`,
    className
  )

  return (
    <div className={CollectionAppliedFiltersClasses} {...restProps}>
      <label className='absolute top-[-10px] text-sm font-500 text-slate-900'>
        Applied filters
      </label>

      <div className='flex items-center gap-[8px]'>
        <Tag
          size='lg'
          appearance='warning'
          onClick={() => {}}
          className='border border-Y-400'
          iconAfter={<i className='ri-close-line text-[16px]' />}>
          <div className='flex items-center gap-[4px]'>
            <span>Background —</span>
            <span className='font-400'>Yellow</span>
          </div>
        </Tag>

        <Tag
          size='lg'
          appearance='warning'
          onClick={() => {}}
          className='border border-Y-400'
          iconAfter={<i className='ri-close-line text-[16px]' />}>
          <div className='flex items-center gap-[4px]'>
            <span>Hat —</span>
            <span className='font-400'>Sports</span>
          </div>
        </Tag>

        <Button appearance='ghost' view='outline' size='sm'>
          Clear all
        </Button>
      </div>
    </div>
  )
}

CollectionAppliedFilters.defaultProps = {}

export default CollectionAppliedFilters
