import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, MetaChip, SOLIcon } from '@oyster/common'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface CollectionChartProps {
  [x: string]: any
}

export const chart = {
  '7days': [
    {
      price: 0.87,
      label: 'Monday',
    },
    {
      price: 0.69,
      label: 'Tuesday',
    },
    {
      price: 0.12,
      label: 'Wednesday',
    },
    {
      price: 0.33,
      label: 'Thursday',
    },
    {
      price: 0.4,
      label: 'Friday',
    },
    {
      price: 0.76,
      label: 'Saturday',
    },
    {
      price: 0.56,
      label: 'Sunday',
    },
  ],
  '4weeks': [
    {
      price: 0.43,
      label: 'Week 1',
    },
    {
      price: 0.57,
      label: 'Week 2',
    },
    {
      price: 0.32,
      label: 'Week 3',
    },
    {
      price: 0.76,
      label: 'Week 4',
    },
  ],
  'year': [
    {
      price: 0.43,
      label: 'Ja',
    },
    {
      price: 0.57,
      label: 'Feb',
    },
    {
      price: 0.32,
      label: 'March',
    },
    {
      price: 0.76,
      label: 'April',
    },
    {
      price: 0.43,
      label: 'May',
    },
    {
      price: 0.57,
      label: 'June',
    },
    {
      price: 0.32,
      label: 'July',
    },
    {
      price: 0.76,
      label: 'Aug',
    },
    {
      price: 0.43,
      label: 'Sep',
    },
    {
      price: 0.57,
      label: 'Oct',
    },
    {
      price: 0.32,
      label: 'Nov',
    },
    {
      price: 0.76,
      label: 'Dec',
    },
  ],
}

export const CollectionChart: FC<CollectionChartProps> = ({
  className,
  ...restProps
}: CollectionChartProps) => {
  const CollectionChartClasses = CN(
    `collection-chart flex flex-col rounded-[8px] py-[20px] px-[24px] border border-slate-200 gap-[20px]`,
    className
  )
  const [selectedChartRange, setSelectedChartRange] = useState<any>('7days')

  return (
    <div className={CollectionChartClasses} {...restProps}>
      <div className='flex'>
        <Button
          isRounded={false}
          appearance='ghost'
          view='outline'
          className='flex-shrink-0'
          iconAfter={<i className='ri-arrow-down-s-line text-[20px] font-400' />}>
          Last 7 days
        </Button>

        <div className='ml-auto flex gap-[24px]'>
          <MetaChip
            overline='7 day avg. price'
            subHeading={
              <div className='flex items-center justify-end gap-[4px]'>
                <SOLIcon className='inline-flex items-center' />
                <span className='flex items-center'>0.25 SOL</span>
              </div>
            }
            hint='$20.97.00'
            align='right'
          />

          <span className='h-full w-[1px] bg-slate-200' />

          <MetaChip
            overline='7 day volume'
            subHeading={
              <div className='flex items-center justify-end gap-[4px]'>
                <SOLIcon className='inline-flex items-center' />
                <span className='flex items-center'>2346 SOL</span>
              </div>
            }
            hint='$196805.94'
            align='right'
          />
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
                <stop offset='10%' stopColor='#0E88FF' stopOpacity={0.8} />
                <stop offset='95%' stopColor='#8B5CF6' stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis stroke='#475569' allowDecimals dataKey='label' tick={{ fontSize: 14 }} />
            <YAxis
              width={30}
              stroke='#475569'
              allowDecimals
              tickCount={10}
              tick={{ fontSize: 14 }}
            />
            <CartesianGrid stroke='#cbd5e1' strokeDasharray='2 2' />
            <Tooltip />
            <Area type='monotone' dataKey='price' stroke='#448FFF' fill='url(#colorPrice)' />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

CollectionChart.defaultProps = {}

export default CollectionChart
