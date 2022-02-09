import React, { FC, useState } from 'react';
import CN from 'classnames';

import { FilterSidebar } from '../../sections/FilterSidebar';
import { CollectionItems } from '../../sections/CollectionItems';
import { CollectionActivity } from '../../sections/CollectionActivity';

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
        <div className="flex w-[280px] bg-gray-50 rounded-[8px] p-[20px] text-base flex-shrink-0 sticky top-[120px] h-[calc(100vh-120px-40px)] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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

            {activeTab === 'items' && <CollectionItems />}
            {activeTab === 'activity' && <CollectionActivity />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionBody;
