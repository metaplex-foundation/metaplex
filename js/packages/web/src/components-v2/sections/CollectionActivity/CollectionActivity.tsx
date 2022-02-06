import React, { FC, useState } from 'react';
import CN from 'classnames';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Chip } from '../../atoms/Chip';
import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
} from '../../atoms/Dropdown';
import { CollectionActivityTable } from '../../sections/CollectionActivityTable';

import { chart } from '../../../../dummy-data/chart';

export interface CollectionActivityProps {
  [x: string]: any;
}

export const CollectionActivity: FC<CollectionActivityProps> = ({
  className,
  ...restProps
}: CollectionActivityProps) => {
  const CollectionActivityClasses = CN(`collection-activity w-full`, className);
  const [selectedChartRange, setSelectedChartRange] = useState<any>('7days');

  return (
    <div className={CollectionActivityClasses} {...restProps}>
      <div className="flex py-[32px]">
        <div className="flex gap-[8px] flex-wrap">
          <Chip>Sales</Chip>

          <button className="appearance-none text-md text-B-400 font-500 h-[32px] px-[8px] rounded-full">
            Clear all
          </button>
        </div>

        <div className="flex ml-auto gap-[20px] items-center">
          <div className="flex border-r border-gray-200 pr-[20px]">
            <Dropdown>
              {({ isOpen, setIsOpen, setInnerValue, innerValue }: any) => {
                const onSelectOption = (label: string) => {
                  setIsOpen(false);
                  setInnerValue(label);
                };

                const options = [
                  { label: 'Last 7 days', value: '7days' },
                  { label: 'Last 4 weeks', value: '4weeks' },
                  { label: 'Last year', value: 'year' },
                ];

                return (
                  <>
                    <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                      <button
                        className={CN(
                          'flex items-center appearance-none h-[32px] text-gray-700 hover:text-gray-800',
                          {
                            '!text-B-400': isOpen,
                          },
                        )}
                      >
                        <span>{innerValue || 'Last 7 days'}</span>
                        {isOpen ? (
                          <i className="ri-arrow-up-s-line" />
                        ) : (
                          <i className="ri-arrow-down-s-line" />
                        )}
                      </button>
                    </DropDownToggle>

                    {isOpen && (
                      <DropDownBody
                        align="right"
                        className="w-[160px] shadow-lg shadow-blue-900/10 mt-[8px]"
                      >
                        {options?.map((option: any, index: number) => {
                          const { label, value } = option;

                          return (
                            <DropDownMenuItem
                              key={index}
                              onClick={() => {
                                onSelectOption(label);
                                setSelectedChartRange(value);
                              }}
                              {...option}
                            >
                              {label}
                            </DropDownMenuItem>
                          );
                        })}
                      </DropDownBody>
                    )}
                  </>
                );
              }}
            </Dropdown>
          </div>

          <div className="flex items-center gap-[12px]">
            <div className="flex flex-col items-center">
              <label className="text-gray-700 text-md">7 Day AVG. price</label>
              <span className="text-B-400 font-500">◎ .345</span>
            </div>

            <div className="flex flex-col items-center">
              <label className="text-gray-700 text-md">7 Day volume</label>
              <span className="text-B-400 font-500">◎ 1,345</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full chart h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={
              (selectedChartRange === '7days' && chart['7days']) ||
              (selectedChartRange === '4weeks' && chart['4weeks']) ||
              (selectedChartRange === 'year' && chart['year']) ||
              chart['7days']
            }
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#448fff" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#69a5ff" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis stroke="#475569" allowDecimals dataKey="label" />
            <YAxis stroke="#475569" allowDecimals tickCount={10} />
            <CartesianGrid stroke="#cbd5e1" strokeDasharray="2 2" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#448FFF"
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex w-full pt-[60px]">
        <CollectionActivityTable />
      </div>
    </div>
  );
};

export default CollectionActivity;
