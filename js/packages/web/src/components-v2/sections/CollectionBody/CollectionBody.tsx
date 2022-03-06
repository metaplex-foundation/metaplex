import React, { FC, useState } from 'react'
import CN from 'classnames'

import { FilterSidebar } from '../../sections/FilterSidebar'
import { CollectionItems } from '../../sections/CollectionItems'
import { CollectionActivity } from '../../sections/CollectionActivity'
import { useViewport } from '@oyster/common'

export interface CollectionBodyProps {
  [x: string]: any
}

export const TabButton = ({ isActive, onClick, children, className }: any) => {
  return (
    <button
      className={CN(
        'mb-[-1px] appearance-none border-b-[2px] border-transparent px-[16px] py-[8px]',
        {
          'border-B-400 font-500': isActive,
        },
        className
      )}
      onClick={onClick}>
      {children}
    </button>
  )
}

export const CollectionBody: FC<CollectionBodyProps> = ({
  className,
  dataItems,
  ...restProps
}: CollectionBodyProps) => {
  const CollectionBodyClasses = CN(`collection-body`, className)
  const [activeTab, setActiveTab] = useState('items')
  const [showFilters, setShowFilters] = useState(true)
  const { isDesktop } = useViewport()

  return (
    <div className={CollectionBodyClasses} {...restProps}>
      <div className='container flex gap-[32px]'>
        {/* Desktop FIlters */}
        {isDesktop && (
          <div className='sticky top-[120px] h-[calc(100vh-120px-40px)] w-[280px] flex-shrink-0 overflow-auto rounded-[8px] bg-gray-50 p-[20px] text-base scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 lg:flex'>
            <FilterSidebar />
          </div>
        )}

        {/* Mobile FIlters */}
        {!isDesktop && showFilters && (
          <>
            <span
              className='fixed top-0 right-0 bottom-0 left-0 z-[50] bg-blue-900/5 backdrop-blur-sm'
              onClick={() => setShowFilters(!showFilters)}
            />

            <div className='fixed top-[0] left-0 z-[100] h-[100vh] w-[280px] flex-shrink-0 overflow-auto rounded-r-[8px] bg-gray-50 p-[20px] text-base shadow-lg shadow-B-700/10  scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 lg:flex'>
              <FilterSidebar />
            </div>
          </>
        )}

        <div className='flex w-full flex-col'>
          <div className='flex h-full w-full flex-col'>
            <div className='flex w-full border-b border-gray-100'>
              <TabButton isActive={activeTab === 'items'} onClick={() => setActiveTab('items')}>
                Items
              </TabButton>
              <TabButton
                isActive={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}>
                Activity
              </TabButton>

              {!isDesktop && (
                <TabButton className='ml-auto' onClick={() => setShowFilters(!showFilters)}>
                  <div className='flex items-center gap-[4px]'>
                    <i className='ri-filter-fill flex text-md' />
                    <span className='inline-flex text-base'>Filter</span>
                  </div>
                </TabButton>
              )}
            </div>

            {activeTab === 'items' && <CollectionItems dataItems={dataItems} />}
            {activeTab === 'activity' && <CollectionActivity />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollectionBody
