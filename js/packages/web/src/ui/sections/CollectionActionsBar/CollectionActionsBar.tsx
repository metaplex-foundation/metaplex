import React, { FC } from 'react'
import CN from 'classnames'
import { Button, SearchField } from '@oyster/common'

export interface CollectionActionsBarProps {
  [x: string]: any
  onClickActivity?: any
  onClickExplore?: any
  showExplore?: boolean
  showActivity?: boolean
}

export const CollectionActionsBar: FC<CollectionActionsBarProps> = ({
  className,
  onClickActivity,
  onClickExplore,
  showExplore,
  showActivity,
  ...restProps
}: CollectionActionsBarProps) => {
  const CollectionActionsBarClasses = CN(
    `collection-actions-bar flex items-center gap-[8px] w-full`,
    className
  )

  return (
    <div className={CollectionActionsBarClasses} {...restProps}>
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

      <SearchField isRounded={false} className='w-full' />

      <Button
        isRounded={false}
        appearance='ghost'
        view='outline'
        className='flex-shrink-0'
        iconAfter={<i className='ri-arrow-down-s-line text-[20px] font-400' />}>
        <span className='uppercase'>
          Price: <span className='normal-case'>Low to High</span>
        </span>
      </Button>
    </div>
  )
}

export default CollectionActionsBar
