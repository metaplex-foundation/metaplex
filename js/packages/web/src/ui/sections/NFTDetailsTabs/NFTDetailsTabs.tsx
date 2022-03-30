import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button } from '@oyster/common'
import { NFTDetailsCurrentOffers, NFTDetailsActivity, NFTDetailsInfo } from '..'

export interface NFTDetailsTabsProps {
  [x: string]: any
}

export const NFTDetailsTabs: FC<NFTDetailsTabsProps> = ({
  className,
  ...restProps
}: NFTDetailsTabsProps) => {
  const NFTDetailsTabsClasses = CN(`nft-details-tabs w-full pt-[20px]`, className)
  const [activeTab, setActiveTab] = useState('offers')

  return (
    <div className={NFTDetailsTabsClasses} {...restProps}>
      <div className='tabs flex flex-col gap-[20px]'>
        <div className='flex items-center gap-[8px] border-b border-slate-200'>
          <Button
            isRounded={false}
            view={activeTab === 'offers' ? 'outline' : 'solid'}
            appearance={activeTab === 'offers' ? 'secondary' : 'ghost'}
            className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
              'border border-transparent': activeTab !== 'offers',
            })}
            onClick={() => setActiveTab('offers')}>
            Current offers
          </Button>
          <Button
            isRounded={false}
            view={activeTab === 'activity' ? 'outline' : 'solid'}
            appearance={activeTab === 'activity' ? 'secondary' : 'ghost'}
            className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
              'border border-transparent': activeTab !== 'activity',
            })}
            onClick={() => setActiveTab('activity')}>
            Activity
          </Button>
          <Button
            isRounded={false}
            view={activeTab === 'details' ? 'outline' : 'solid'}
            appearance={activeTab === 'details' ? 'secondary' : 'ghost'}
            className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
              'border border-transparent': activeTab !== 'details',
            })}
            onClick={() => setActiveTab('details')}>
            Details
          </Button>
        </div>

        <div className='flex flex-col'>
          {activeTab === 'offers' && <NFTDetailsCurrentOffers />}
          {activeTab === 'activity' && <NFTDetailsActivity />}
          {activeTab === 'details' && <NFTDetailsInfo />}
        </div>
      </div>
    </div>
  )
}

NFTDetailsTabs.defaultProps = {}

export default NFTDetailsTabs
