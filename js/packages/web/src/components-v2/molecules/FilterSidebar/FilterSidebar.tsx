import React, { FC } from 'react';
import CN from 'classnames';
import { Accordion } from '../../molecules/Accordion';
import LeftIcon from '../../icons/Left';
import { TextField } from '../../atoms/TextField';
import { CheckBox } from '../../atoms/CheckBox';

import { filters } from '../../../../dummy-data/filters';

export interface FilterSidebarProps {
  [x: string]: any;
}

export const FilterSidebar: FC<FilterSidebarProps> = ({
  className,
  ...restProps
}: FilterSidebarProps) => {
  const FilterSidebarClasses = CN(`filter-sidebar w-full`, className);

  return (
    <div className={FilterSidebarClasses} {...restProps}>
      <div className="flex items-center justify-between border-b border-gray-200 pb-[16px]">
        <h3 className="text-lg font-500">Filters</h3>
        <button className="appearance-none text-N-800">
          <LeftIcon width={24} height={24} />
        </button>
      </div>

      <div className="flex flex-col w-full">
        <Accordion
          heading="Status"
          className="py-[20px] border-b border-gray-200"
          headingClassName="hover:text-B-400"
          defaultOpen={true}
        >
          <div className="flex gap-[16px] w-full">
            <button className="appearance-none text-md bg-B-400 hover:bg-B-500 text-white font-500 h-[32px] px-[16px] rounded-full">
              Buy Now
            </button>
            <button className="appearance-none text-md bg-gray-400 hover:bg-gray-500 text-white font-500 h-[32px] px-[16px] rounded-full">
              Newly Listed
            </button>
          </div>
        </Accordion>

        <Accordion
          heading="Price range"
          className="py-[20px] border-b border-gray-200"
          headingClassName="hover:text-B-400"
          defaultOpen={true}
        >
          <div className="flex gap-[16px] w-full items-center">
            <TextField label="From" placeholder="0.01" />
            <TextField label="To" placeholder="2" />
            <span className='text-[20px] h-full pt-[20px] text-gray-800'>◎</span>
          </div>
        </Accordion>

        <Accordion
          heading="Face"
          className="py-[20px] border-b border-gray-200"
          headingClassName="hover:text-B-400"
        >
          <div className="flex flex-col gap-[8px] w-full">
            {filters.face.map(({ label, value }: any, index: number) => (
              <CheckBox key={index} className="w-full">
                <div className="flex justify-between w-full">
                  <span>{label}</span>
                  <span className="font-500">{value}</span>
                </div>
              </CheckBox>
            ))}
          </div>
        </Accordion>

        <Accordion
          heading="Background"
          className="py-[20px] border-b border-gray-200"
          headingClassName="hover:text-B-400"
        >
          <div className="flex flex-col gap-[8px] w-full">
            {filters.face.map(({ label, value }: any, index: number) => (
              <CheckBox key={index} className="w-full">
                <div className="flex justify-between w-full">
                  <span>{label}</span>
                  <span className="font-500">{value}</span>
                </div>
              </CheckBox>
            ))}
          </div>
        </Accordion>

        <Accordion
          heading="Shirt"
          className="py-[20px] border-b border-gray-200"
          headingClassName="hover:text-B-400"
        >
          <div className="flex flex-col gap-[8px] w-full">
            {filters.face.map(({ label, value }: any, index: number) => (
              <CheckBox key={index} className="w-full">
                <div className="flex justify-between w-full">
                  <span>{label}</span>
                  <span className="font-500">{value}</span>
                </div>
              </CheckBox>
            ))}
          </div>
        </Accordion>

        <Accordion
          heading="Tier"
          className="py-[20px]"
          headingClassName="hover:text-B-400"
        >
          <div className="flex flex-col gap-[8px] w-full">
            {filters.face.map(({ label, value }: any, index: number) => (
              <CheckBox key={index} className="w-full">
                <div className="flex justify-between w-full">
                  <span>{label}</span>
                  <span className="font-500">{value}</span>
                </div>
              </CheckBox>
            ))}
          </div>
        </Accordion>
      </div>
    </div>
  );
};

export default FilterSidebar;
