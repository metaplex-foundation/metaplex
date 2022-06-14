import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, TextField, Chip, Tag, AttributesCard } from '@oyster/common'
import { PriceRangeInterface } from '../../views'

export interface CollectionSidebarProps {
  setPriceRange: (range: PriceRangeInterface) => void
  range: PriceRangeInterface
  applyRange: () => void
  filterAttributes: Array<any>
  addAttributeFilters: (data: any) => void
}

export const CollectionSidebar: FC<CollectionSidebarProps> = ({
  setPriceRange,
  range,
  applyRange,
  filterAttributes,
  addAttributeFilters,
}) => {
  const [showAttributes, setShowAttributes] = useState(false)
  const [attr, setAttr] = useState()

  console.log('filterAttributes', filterAttributes)

  const addToFilter = label => {
    addAttributeFilters({
      attr,
      label,
    })
    setShowAttributes(false)
  }
  return (
    <div className='collection-sidebar flex w-[300px] overflow-x-hidden'>
      <div
        className={CN('flex w-[600px] flex-shrink-0 transition-all', {
          'translate-x-[-300px]': showAttributes,
          'translate-x-[0]': !showAttributes,
        })}>
        <div
          className={CN(
            'filters-sidebar flex w-[300px] flex-shrink-0 flex-col gap-[32px] transition-all'
          )}>
          <h2 className='text-h5'>Filters</h2>

          <div className='price-filter flex flex-col gap-[12px]'>
            <h3 className='text-h6'>Price filter</h3>

            <div className='flex items-center gap-[8px]'>
              <TextField
                type='number'
                value={range.min ?? ''}
                onChange={e => setPriceRange({ ...range, min: e.target.value })}
                placeholder='Min price'
              />
              <TextField
                onChange={e => setPriceRange({ ...range, max: e.target.value })}
                type='number'
                value={range.max ?? ''}
                placeholder='Max price'
              />
              <Button onClick={applyRange} isRounded={false} appearance='secondary' view='outline'>
                Apply
              </Button>
            </div>
          </div>

          <div className='flex w-[300px] flex-shrink-0 flex-col gap-[12px]'>
            <h3 className='text-h6'>Attributes</h3>

            <div className='flex flex-col gap-[8px]'>
              {filterAttributes.map(({ trait_type, values }, key) => (
                <Chip
                  key={key}
                  label={trait_type}
                  tag={values.length}
                  onClick={() => {
                    setShowAttributes(true)
                    setAttr(trait_type)
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={CN('attributes-sidebar flex w-full flex-col gap-[32px] transition-all')}>
          <div className='inline-flex w-full items-center'>
            <div className='flex items-center gap-[12px]'>
              <i
                className='ri-arrow-left-s-line cursor-pointer text-[24px]'
                onClick={() => setShowAttributes(false)}
              />
              <h2 className='text-h5'>Add {attr}</h2>
            </div>
            <Tag className='ml-auto w-[40px] justify-center'>
              {
                (filterAttributes.find(({ trait_type }) => trait_type === attr)?.values || [])
                  .length
              }
            </Tag>
          </div>
          <div className='flex flex-col gap-[8px]'>
            {(filterAttributes.find(({ trait_type }) => trait_type === attr)?.values || []).map(
              (item, index: number) => (
                <AttributesCard
                  addToFilter={() => addToFilter(item)}
                  key={index}
                  label={item.name}
                  description={item.floor}
                  tagIcon={item.tagIcon}
                  tagValue={item.tagValue}
                  hasHoverEffect={true}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

CollectionSidebar.defaultProps = {}

export default CollectionSidebar
