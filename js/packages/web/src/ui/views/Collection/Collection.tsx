import React, { FC, useState } from 'react'
import CN from 'classnames'
import { CollectionHeader } from '../../sections/CollectionHeader'
import { CollectionSidebar } from '../../sections/CollectionSidebar'
import { CollectionActionsBar } from '../../sections/CollectionActionsBar'
import { CollectionAppliedFilters } from '../../sections/CollectionAppliedFilters'
import { CollectionNftList } from '../../sections/CollectionNftList'
import { CollectionChart } from '../../sections/CollectionChart'
import { CollectionActivityList } from '../../sections/CollectionActivityList'

export interface CollectionProps {
  [x: string]: any
}

export const Collection: FC<CollectionProps> = ({ className, ...restProps }: CollectionProps) => {
  const CollectionClasses = CN(`collection`, className)
  const [showActivity, setShowActivity] = useState(false)
  const [showExplore, setShowExplore] = useState(true)

  return (
    <div className={CollectionClasses} {...restProps}>
      <CollectionHeader
        isVerified
        avatar='https://i.imgur.com/QRUzR7g.png'
        cover='/img/dummy-collection-cover.png'
        title='Degenerate Ape Academy'
        description='Our mission here at the academy is simple: Take 10,000 of the smoothest brained apes, put them all in one location and let the mayhem ensue.'
      />

      <div className='flex w-full pt-[80px] pb-[100px]'>
        <div className='container flex gap-[32px]'>
          <div className='sidebar flex-shrink-0 pr-[16px]'>
            <CollectionSidebar />
          </div>

          <div className='content-wrapper flex w-full flex-col gap-[28px]'>
            <CollectionActionsBar
              onClickActivity={() => {
                setShowExplore(false)
                setShowActivity(true)
              }}
              onClickExplore={() => {
                setShowExplore(true)
                setShowActivity(false)
              }}
              showActivity={showActivity}
              showExplore={showExplore}
            />

            {showExplore && (
              <div className='flex flex-col gap-[28px]'>
                <CollectionAppliedFilters />
                <CollectionNftList />
              </div>
            )}

            {showActivity && (
              <div className='flex flex-col gap-[28px]'>
                <CollectionChart />
                <CollectionActivityList />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Collection
