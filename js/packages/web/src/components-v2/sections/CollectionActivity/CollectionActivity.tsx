import React, { FC, useState } from 'react'
import CN from 'classnames'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { Chip } from '../../atoms/Chip'
import { Dropdown, DropDownBody, DropDownToggle, DropDownMenuItem } from '../../atoms/Dropdown'
import { CollectionActivityTable } from '../../sections/CollectionActivityTable'

import { chart } from '../../../../dummy-data/chart'
import { Button, useViewport } from '@oyster/common'

export interface CollectionActivityProps {
  [x: string]: any
}

export const CollectionActivity: FC<CollectionActivityProps> = ({
  className,
  ...restProps
}: CollectionActivityProps) => {
  const CollectionActivityClasses = CN(`collection-activity w-full`, className)
  const [selectedChartRange, setSelectedChartRange] = useState<any>('7days')
  const { isMobile } = useViewport()

  return (
    <div className={CollectionActivityClasses} {...restProps}>
      <div className='flex flex-col pt-[16px] pb-[24px] md:flex-row md:py-[32px]'>
        <div className='flex w-full flex-wrap gap-[8px] pb-[16px] md:pb-0'>
          <Chip>Sales</Chip>

          <button className='h-[32px] appearance-none rounded-full px-[8px] text-md font-500 text-B-400'>
            Clear all
          </button>
        </div>

        <div className='flex flex-shrink-0 flex-col items-center gap-[20px] md:flex-row lg:ml-auto'>
          <div className='flex w-full border-gray-200 md:w-auto md:pr-[20px] lg:border-r'>
            <Dropdown className='w-full'>
              {({ isOpen, setIsOpen, setInnerValue, innerValue }: any) => {
                const onSelectOption = (label: string) => {
                  setIsOpen(false)
                  setInnerValue(label)
                }

                const options = [
                  { label: 'Last 7 days', value: '7days' },
                  { label: 'Last 4 weeks', value: '4weeks' },
                  { label: 'Last year', value: 'year' },
                ]

                return (
                  <>
                    <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                      <Button
                        appearance={isMobile ? 'secondary' : 'ghost'}
                        className='w-full'
                        size={isMobile ? 'sm' : 'md'}
                        view={isMobile ? 'outline' : 'solid'}>
                        <span>
                          {isMobile && 'Graph:'} {innerValue || 'Last 7 days'}
                        </span>
                        {isOpen ? (
                          <i className='ri-arrow-up-s-line' />
                        ) : (
                          <i className='ri-arrow-down-s-line' />
                        )}
                      </Button>
                    </DropDownToggle>

                    {isOpen && (
                      <DropDownBody
                        align={isMobile ? 'center' : 'right'}
                        className='mt-[8px] w-full md:w-[160px] border border-x border-B-10 shadow-lg shadow-B-700/5'>
                        {options?.map((option: any, index: number) => {
                          const { label, value } = option

                          return (
                            <DropDownMenuItem
                              key={index}
                              onClick={() => {
                                onSelectOption(label)
                                setSelectedChartRange(value)
                              }}
                              {...option}>
                              {label}
                            </DropDownMenuItem>
                          )
                        })}
                      </DropDownBody>
                    )}
                  </>
                )
              }}
            </Dropdown>
          </div>

          <div className='grid grid-cols-2 items-center gap-[12px] md:ml-auto md:flex lg:ml-0'>
            <div className='flex flex-col items-center'>
              <label className='text-md text-gray-700'>7 Day AVG. price</label>
              <span className='font-500 text-B-400'>◎ .345</span>
            </div>

            <div className='flex flex-col items-center'>
              <label className='text-md text-gray-700'>7 Day volume</label>
              <span className='font-500 text-B-400'>◎ 1,345</span>
            </div>
          </div>
        </div>
      </div>

      <div className='chart h-[150px] w-full'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart
            data={
              (selectedChartRange === '7days' && chart['7days']) ||
              (selectedChartRange === '4weeks' && chart['4weeks']) ||
              (selectedChartRange === 'year' && chart['year']) ||
              chart['7days']
            }>
            <defs>
              <linearGradient id='colorPrice' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='10%' stopColor='#448fff' stopOpacity={0.8} />
                <stop offset='95%' stopColor='#69a5ff' stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis stroke='#475569' allowDecimals dataKey='label' />
            <YAxis width={30} stroke='#475569' allowDecimals tickCount={10} />
            <CartesianGrid stroke='#cbd5e1' strokeDasharray='2 2' />
            <Tooltip />
            <Area type='monotone' dataKey='price' stroke='#448FFF' fill='url(#colorPrice)' />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className='flex w-full overflow-x-auto pt-[32px] lg:pt-[40px]'>
        <CollectionActivityTable className="min-w-[700px]" />
      </div>
    </div>
  )
}

export default CollectionActivity
