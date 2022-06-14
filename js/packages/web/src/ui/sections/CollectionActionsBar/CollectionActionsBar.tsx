import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, SearchField } from '@oyster/common'
import { SORT_HIGH_TO_LOW, SORT_LOW_TO_HIGH } from '../../views'

export interface CollectionActionsBarProps {
  [x: string]: any
  onClickActivity?: any
  onClickExplore?: any
  showExplore?: boolean
  showActivity?: boolean
  searchText: string
  sortByPrice: (text: string) => void
  onChangeSearchText: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const CollectionActionsBar: FC<CollectionActionsBarProps> = ({
  onClickActivity,
  onClickExplore,
  showExplore,
  showActivity,
  sortByPrice,
  onChangeSearchText,
  isSidebarCollapsed,
  onSidebarCollapse,
}) => {
  const [sortText, setSortText] = useState(SORT_LOW_TO_HIGH)

  return (
    <div className='collection-actions-bar flex w-full items-center gap-[8px]'>
      {isSidebarCollapsed && (
        <Button
          isRounded={false}
          appearance={'ghost'}
          view={'outline'}
          onClick={onSidebarCollapse}
          iconBefore={<i className='ri-equalizer-fill' />}>
          Filters
        </Button>
      )}

      <Button
        isRounded={false}
        appearance={showExplore ? 'neutral' : 'ghost'}
        view={showExplore ? 'solid' : 'outline'}
        className={CN('!border', {
          'border-slate-900': showExplore,
        })}
        onClick={onClickExplore}>
        Explore
      </Button>

      <Button
        isRounded={false}
        appearance={showActivity ? 'neutral' : 'ghost'}
        view={showActivity ? 'solid' : 'outline'}
        className={CN('!border', {
          'border-slate-900': showActivity,
        })}
        onClick={onClickActivity}>
        Activity
      </Button>

      <SearchField onChange={onChangeSearchText} isRounded={false} className='w-full' />

      <Button
        onClick={() => {
          if (sortText === SORT_LOW_TO_HIGH) {
            sortByPrice(SORT_HIGH_TO_LOW)
            setSortText(SORT_HIGH_TO_LOW)
          } else {
            sortByPrice(SORT_LOW_TO_HIGH)
            setSortText(SORT_LOW_TO_HIGH)
          }
        }}
        isRounded={false}
        appearance='ghost'
        view='outline'
        className='flex-shrink-0'
        // iconAfter={<i className='ri-arrow-down-s-line text-[20px] font-400' />}
      >
        <span className='uppercase'>
          Price: <span className='normal-case'>{sortText}</span>
        </span>
      </Button>
    </div>
  )
}

export default CollectionActionsBar
