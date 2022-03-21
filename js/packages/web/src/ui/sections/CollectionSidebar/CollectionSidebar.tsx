import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, TextField, Chip, Tag, AttributesCard } from '@oyster/common'

export interface CollectionSidebarProps {
  [x: string]: any
}

const dummyAttributes = [
  {
    label: 'Orange',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Yellow',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Green',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Purple',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Black',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Blue',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Pink',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Red',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Grey',
    description: '57.00',
    tag: '44.14%',
  },
  {
    label: 'Sky Blue',
    description: '57.00',
    tag: '44.14%',
  },
]

export const CollectionSidebar: FC<CollectionSidebarProps> = ({
  className,
  ...restProps
}: CollectionSidebarProps) => {
  const CollectionSidebarClasses = CN(
    `collection-sidebar w-[300px] overflow-x-hidden flex`,
    className
  )
  const [showAttributes, setShowAttributes] = useState(false)

  return (
    <div className={CollectionSidebarClasses} {...restProps}>
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
              <TextField placeholder='Min price' />
              <TextField placeholder='Max price' />
              <Button isRounded={false} appearance='secondary' view='outline'>
                Apply
              </Button>
            </div>
          </div>

          <div className='flex w-[300px] flex-shrink-0 flex-col gap-[12px]'>
            <h3 className='text-h6'>Attributes</h3>

            <div className='flex flex-col gap-[8px]'>
              <Chip label='Background' tag='10' onClick={() => setShowAttributes(true)} />
              <Chip label='Clothing' tag='12' onClick={() => setShowAttributes(true)} />
              <Chip label='Eyewear' tag='8' onClick={() => setShowAttributes(true)} />
              <Chip label='Hat' tag='5' onClick={() => setShowAttributes(true)} />
              <Chip label='Glasses' tag='17' onClick={() => setShowAttributes(true)} />
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
              <h2 className='text-h5'>Add background</h2>
            </div>
            <Tag className='ml-auto w-[40px] justify-center'>10</Tag>
          </div>

          <div className='flex flex-col gap-[8px]'>
            {dummyAttributes.map(({ label, description, tag }: any, index: number) => (
              <AttributesCard
                key={index}
                label={label}
                description={description}
                tag={
                  <div className='flex w-full items-center justify-center gap-[8px]'>
                    <span>🔥</span>
                    <span>{tag}</span>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

CollectionSidebar.defaultProps = {}

export default CollectionSidebar
