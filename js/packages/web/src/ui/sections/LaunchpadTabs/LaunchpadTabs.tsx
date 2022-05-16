import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button } from '@oyster/common'
import { LaunchpadDetailsRoadMap, LaunchpadDetailsAbout, LaunchpadDetailsTeam } from '../'

export interface LaunchpadTabsProps {
  [x: string]: any
}

export const LaunchpadTabs: FC<LaunchpadTabsProps> = ({
  className,
  ...restProps
}: LaunchpadTabsProps) => {
  const LaunchpadTabsClasses = CN(`launchpad-tabs`, className)
  const [activeTab, setActiveTab] = useState('about')

  return (
    <div className={LaunchpadTabsClasses} {...restProps}>
      <div className='tabs flex flex-col gap-[20px]'>
        <div className='flex items-center gap-[8px] border-b border-slate-200'>
          <Button
            isRounded={false}
            view={activeTab === 'about' ? 'outline' : 'solid'}
            appearance={activeTab === 'about' ? 'secondary' : 'ghost'}
            className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
              'border border-transparent': activeTab !== 'about',
              'text-B-400': activeTab == 'about',
            })}
            onClick={() => setActiveTab('about')}>
            About
          </Button>
          <Button
            isRounded={false}
            view={activeTab === 'road-map' ? 'outline' : 'solid'}
            appearance={activeTab === 'road-map' ? 'secondary' : 'ghost'}
            className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
              'border border-transparent': activeTab !== 'road-map',
              'text-B-400': activeTab == 'road-map',
            })}
            onClick={() => setActiveTab('road-map')}>
            Road map
          </Button>
          <Button
            isRounded={false}
            view={activeTab === 'team' ? 'outline' : 'solid'}
            appearance={activeTab === 'team' ? 'secondary' : 'ghost'}
            className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
              'border border-transparent': activeTab !== 'team',
              'text-B-400': activeTab == 'team',
            })}
            onClick={() => setActiveTab('team')}>
            Team
          </Button>
        </div>

        <div className='flex w-full flex-col'>
          {activeTab === 'about' && <LaunchpadDetailsAbout discription={restProps.description} />}
          {activeTab === 'road-map' && <LaunchpadDetailsRoadMap discription={restProps.longTermGoals} />}
          {activeTab === 'team' && <LaunchpadDetailsTeam discription={restProps.teamDescription} />}
        </div>
      </div>
    </div>
  )
}

LaunchpadTabs.defaultProps = {}

export default LaunchpadTabs
