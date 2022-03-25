import React, { FC } from 'react'
import { Tag, Button } from '@oyster/common'
import { AppliedFiltersInterface } from '../../views'

export interface CollectionAppliedFiltersProps {
  filters: AppliedFiltersInterface[]
  clearFilters: () => void
  removeAppliedAttr: (data: any) => void
}

export const CollectionAppliedFilters: FC<CollectionAppliedFiltersProps> = ({
  filters,
  clearFilters,
  removeAppliedAttr,
}) => {
  return (
    <div className='collection-applied-filters relative rounded-[8px] border border-slate-200 bg-slate-10 px-[20px] py-[24px]'>
      <label className='absolute top-[-10px] text-sm font-500 text-slate-900'>
        Applied filters
      </label>

      <div className='flex items-center gap-[8px]'>
        {filters.map(({ text, type }, key) => (
          <Tag
            key={key}
            size='lg'
            appearance='warning'
            onClick={() => {}}
            className='border border-Y-400'
            iconAfter={
              <i
                onClick={() =>
                  removeAppliedAttr({
                    text,
                    type,
                  })
                }
                className='ri-close-line text-[16px]'
              />
            }>
            <div className='flex items-center gap-[4px]'>
              <span>{type} —</span>
              <span className='font-400'>{text}</span>
            </div>
          </Tag>
        ))}

        {/* <Tag
          size='lg'
          appearance='warning'
          onClick={() => {}}
          className='border border-Y-400'
          iconAfter={<i className='ri-close-line text-[16px]' />}>
          <div className='flex items-center gap-[4px]'>
            <span>Price —</span>
            <span className='font-400'>30 - 40</span>
          </div>
        </Tag>
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
        </Tag> */}

        <Button onClick={clearFilters} appearance='ghost' view='outline' size='sm'>
          Clear all
        </Button>
      </div>
    </div>
  )
}

CollectionAppliedFilters.defaultProps = {}

export default CollectionAppliedFilters
