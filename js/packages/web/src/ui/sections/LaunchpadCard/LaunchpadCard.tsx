import React, { FC } from 'react'
import CN from 'classnames'
import { SectionHeading, MetaChip, Button } from '@oyster/common'

export interface LaunchpadCardProps {
  [x: string]: any
}

export const LaunchpadCard: FC<LaunchpadCardProps> = ({
  className,
  ...restProps
}: LaunchpadCardProps) => {
  const LaunchpadCardClasses = CN(`launchpad-card w-full`, className)

  return (
    <div className={LaunchpadCardClasses} {...restProps}>
      <div className='container pt-[56px]'>
        <div className='relative flex min-h-[452px] w-full gap-[100px] rounded bg-launchpad py-[80px] px-[48px] text-white'>
          <img src='/img/launchpad-bg-pattern.svg' className='absolute top-0 left-0 z-0 w-full' />

          <div className='absolute left-[48px] bottom-0 z-[100]'>
            <img src='/img/launchpad-rocket.svg' className='w-[336px]' />
          </div>

          <div className='relative z-10 flex flex-col gap-[28px] pl-[436px]'>
            <SectionHeading
              overline='Launch your project'
              heading='Using our Launchpad'
              commonClassName='!text-white'
              headingClassName='!text-white text-display-lg'
            />

            <div className='flex items-center gap-[32px]'>
              <MetaChip
                commonClassName='!text-white'
                headingClassName='text-h4 font-700'
                heading='12.1M+'
                description='NFTs minted'
              />

              <span className='flex h-[60px] w-[1px] bg-N-200' />

              <MetaChip
                commonClassName='!text-white'
                headingClassName='text-h4 font-700'
                heading={
                  <div className='flex items-center gap-[4px]'>
                    <span className='text-[16px]'>Ⓞ</span>
                    <span>2,398+</span>
                  </div>
                }
                description='Daily SOL volume'
              />

              <span className='flex h-[60px] w-[1px] bg-N-200' />

              <MetaChip
                commonClassName='!text-white'
                headingClassName='text-h4 font-700'
                heading={
                  <div className='flex items-center gap-[4px]'>
                    <span className='text-[16px]'>Ⓞ</span>
                    <span>0.001 SOL</span>
                  </div>
                }
                description='Lowest fees'
              />
            </div>

            <div className='flex items-center pt-[12px]'>
              <Button
                appearance='primary'
                size='lg'
                iconAfter={<i className='ri-arrow-right-s-line' />}>
                Submit your collection
              </Button>
              <Button
                appearance='ghost-invert'
                size='lg'
                iconAfter={<i className='ri-arrow-right-s-line' />}>
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

LaunchpadCard.defaultProps = {}

export default LaunchpadCard
