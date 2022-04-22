import React, { FC } from 'react'
import CN from 'classnames'
import { LaunchpadTopBar, LaunchpadDetailCard, LaunchpadTabs } from '../../sections'

export interface LaunchpadDetailsProps {
  [x: string]: any
}

export const LaunchpadDetails: FC<LaunchpadDetailsProps> = ({
  className,
  ...restProps
}: LaunchpadDetailsProps) => {
  const LaunchpadDetailsClasses = CN(`launchpad-details w-full`, className)

  return (
    <div className={LaunchpadDetailsClasses} {...restProps}>
      <LaunchpadTopBar className='pt-[20px] pb-[40px]' />

      <div className='w-full pb-[60px]'>
        <div className='container flex flex-col gap-[40px] rounded border border-slate-200 bg-white p-[40px] shadow-card-light'>
          <div className='flex justify-between'>
            <div className='flex max-w-[564px] flex-col gap-[16px]'>
              <div className='flex flex-col gap-[16px]'>
                <h2 className='text-h2 font-500 text-slate-800'>The Stoned Frogs</h2>
                <p className='text-base font-400 text-gray-800'>
                  A collection of 8,400 Stoned Frogs coming to grow $SEEDS and take <br /> over the
                  cannabis world. Ribbit!
                </p>
              </div>

              <LaunchpadDetailCard
                price='Ⓞ 2.36 SOL'
                priceInDollars='$4.19'
                launchTime='20h : 35m : 08s'
              />

              <div className='flex gap-[16px]'>
                <div className='rounded-[4px] bg-red-100 px-[8px] py-[4px]'>
                  <p className='text-sm font-500 text-red-700'>DOXXED</p>
                </div>
                <div className='rounded-[4px] bg-red-100 px-[8px] py-[4px]'>
                  <p className='text-sm font-500 text-red-700'>Escrow 1 day</p>
                </div>
              </div>
            </div>

            <div className='flex flex-shrink-0'>
              <img
                src='/img/frog.png'
                className='h-[332px] w-[500px] rounded-[12px] object-cover object-center'
              />
            </div>
          </div>

          <div className='flex w-full flex-col pt-[40px] pb-[40px]'>
            <LaunchpadTabs />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LaunchpadDetails
