import React, { FC, useState } from 'react';
import CN from 'classnames';

import { arts } from '../../../../dummy-data/arts';

import { Chip } from '../../atoms/Chip';
import { TextField } from '../../atoms/TextField';
import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
} from '../../atoms/Dropdown';
import { ArtCard } from '../../molecules/ArtCard';
import { FilterSidebar } from '../../molecules/FilterSidebar';

export interface CollectionBodyProps {
  [x: string]: any;
}

export const TabButton = ({ isActive, onClick, children }: any) => {
  return (
    <button
      className={CN(
        'appearance-none px-[16px] border-b-[2px] border-transparent py-[8px] mb-[-1px]',
        {
          'border-B-400 font-500': isActive,
        },
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export const CollectionBody: FC<CollectionBodyProps> = ({
  className,
  ...restProps
}: CollectionBodyProps) => {
  const CollectionBodyClasses = CN(`collection-body`, className);
  const [activeTab, setActiveTab] = useState('items');

  return (
    <div className={CollectionBodyClasses} {...restProps}>
      <div className="container flex gap-[32px]">
        <div className="flex w-[280px] bg-gray-50 rounded-[12px] p-[20px] text-base flex-shrink-0 sticky top-[120px] h-[calc(100vh-120px-40px)] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <FilterSidebar />
        </div>

        <div className="flex flex-col w-full">
          <div className="flex flex-col w-full h-full">
            <div className="flex border-b border-gray-100">
              <TabButton
                isActive={activeTab === 'items'}
                onClick={() => setActiveTab('items')}
              >
                Items
              </TabButton>
              <TabButton
                isActive={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </TabButton>
            </div>

            <div className="flex py-[32px] gap-[8px] flex-wrap">
              <Chip onClose={() => {}}>Buy Now</Chip>
              <Chip onClose={() => {}} label="Character">
                Foxy belugie
              </Chip>
              <Chip onClose={() => {}} label="Price range">
                ◎ .05 - ◎ .10
              </Chip>
              <Chip onClose={() => {}} label="Face">
                Happy
              </Chip>
              <Chip onClose={() => {}} label="Shirt">
                Beach
              </Chip>

              <button className="appearance-none text-md text-B-400 font-500 h-[32px] px-[8px] rounded-full">
                Clear all
              </button>
            </div>

            <div className="flex gap-[20px]">
              <TextField
                iconBefore={<i className="ri-search-2-line" />}
                placeholder="Search for traits, tags, item #s, and more..."
                size="sm"
              />

              <Dropdown className="w-[260px]">
                {({ isOpen, setIsOpen, setInnerValue, innerValue }: any) => {
                  const onSelectOption = (value: string) => {
                    setIsOpen(false);
                    setInnerValue(value);
                  };

                  const options = [
                    { label: 'Art: A to Z', value: 'Art: A to Z' },
                    { label: 'Art: Z to A', value: 'Art: Z to A' },
                    {
                      label: 'Price: Low to High',
                      value: 'Price: Low to High',
                    },
                    {
                      label: 'Price: High to Low',
                      value: 'Price: High to Low',
                    },
                  ];

                  return (
                    <>
                      <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                        <TextField
                          iconAfter={
                            isOpen ? (
                              <i className="ri-arrow-up-s-line" />
                            ) : (
                              <i className="ri-arrow-down-s-line" />
                            )
                          }
                          value={innerValue || 'Price: Low to High'}
                          readOnly
                          size="sm"
                        />
                      </DropDownToggle>

                      {isOpen && (
                        <DropDownBody
                          align="right"
                          className="w-full shadow-lg mt-[8px]"
                        >
                          {options?.map((option: any, index: number) => {
                            const { label, value } = option;

                            return (
                              <DropDownMenuItem
                                key={index}
                                onClick={() => onSelectOption(value)}
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
          </div>

          <div className="grid grid-cols-4 gap-[28px] pt-[32px]">
            {arts.map((art: any, index: number) => {
              return <ArtCard key={index} {...art} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionBody;
