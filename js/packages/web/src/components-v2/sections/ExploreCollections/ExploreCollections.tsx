import React, { FC } from 'react';
import CN from 'classnames';
import { useRouter } from 'next/router';

import { categories } from '../../../../dummy-data/categories';
import { collections } from '../../../../dummy-data/explore-collections';

import { NftCard } from '../../molecules/NftCard';

export interface ExploreCollectionsProps {
  [x: string]: any;
}

export const ExploreCollections: FC<ExploreCollectionsProps> = ({
  className,
  ...restProps
}: ExploreCollectionsProps) => {
  const { query, push } = useRouter();
  const { pid } = query;

  const ExploreCollectionsClasses = CN(
    `explore-collections py-[80px]`,
    className,
  );

  return (
    <div className={ExploreCollectionsClasses} {...restProps}>
      <div className="container flex flex-col items-center">
        <h1 className="text-h2">Explore collections</h1>

        <div className="flex gap-[32px] pt-[60px] pb-[60px]">
          {categories?.map(({ label, value }: any, index: number) => {
            return (
              <div
                key={value || index}
                className={CN(
                  'cursor-pointer flex flex-col px-[12px] pb-[8px] relative',
                  {
                    'text-N-800 font-500': pid === value,
                    'text-N-500 hover:text-N-700': pid !== value,
                  },
                )}
                onClick={() => {
                  push({ pathname: '/explore', query: { pid: value } });
                }}
              >
                <span>{label}</span>

                {pid === value && (
                  <span className="bg-[linear-gradient(89.57deg,_#3E9CD1_0.79%,_#224CB8_124%)] h-[4px] w-full rounded-full absolute left-0 right-0 bottom-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-x-[32px] gap-y-[32px] pb-[100px]">
          {pid === 'trending' &&
            collections?.trending?.map(
              ({ id, ...restProps }: any, index: number) => {
                return <NftCard key={id || index} {...restProps} />;
              },
            )}

          {pid === 'art' &&
            collections?.art?.map(
              ({ id, ...restProps }: any, index: number) => {
                return <NftCard key={id || index} {...restProps} />;
              },
            )}

          {pid === 'charity' &&
            collections?.charity?.map(
              ({ id, ...restProps }: any, index: number) => {
                return <NftCard key={id || index} {...restProps} />;
              },
            )}

          {pid === 'gaming' &&
            collections?.gaming?.map(
              ({ id, ...restProps }: any, index: number) => {
                return <NftCard key={id || index} {...restProps} />;
              },
            )}

          {pid === 'utility' &&
            collections?.utility?.map(
              ({ id, ...restProps }: any, index: number) => {
                return <NftCard key={id || index} {...restProps} />;
              },
            )}
        </div>
      </div>
    </div>
  );
};

export default ExploreCollections;
