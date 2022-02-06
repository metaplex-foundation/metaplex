import React, { FC } from 'react';
import CN from 'classnames';
import { useRouter } from 'next/router';
import Link from 'next/link';

import { categories } from '../../../../dummy-data/categories';
import { collections } from '../../../../dummy-data/explore-collections';

import { NftCard } from '../../molecules/NftCard';
import { TextField } from '../../atoms/TextField';

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
        <h1 className="text-h2 font-500">Explore collections</h1>

        <div className="flex w-full max-w-[480px] pt-[20px]">
          <TextField
            iconBefore={<i className="ri-search-2-line" />}
            placeholder="Search for traits, tags, item #s, and more..."
            size="sm"
            wrapperClassName="!border-transparent !bg-gray-100 !w-full focus-within:!bg-white"
          />
        </div>

        <div className="flex gap-[32px] pt-[40px] pb-[80px]">
          {categories?.map(({ label, value }: any, index: number) => {
            return (
              <div
                key={value || index}
                className={CN(
                  'cursor-pointer flex flex-col px-[12px] pb-[8px] relative',
                  {
                    'text-gray-800': pid === value,
                    'text-gray-500 hover:text-gray-700': pid !== value,
                  },
                )}
                onClick={() => {
                  push({ pathname: '/explore', query: { pid: value } });
                }}
              >
                <span>{label}</span>

                <span
                  className={CN(
                    'bg-[linear-gradient(89.57deg,_#3E9CD1_0.79%,_#224CB8_124%)] h-[4px] w-full rounded-full absolute left-0 right-0 bottom-0 opacity-0 transition-all',
                    {
                      'opacity-[1]': pid === value,
                    },
                  )}
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-x-[32px] gap-y-[32px] pb-[100px]">
          {pid === 'trending' &&
            collections?.trending?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} href="/collection" passHref>
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'collectibles' &&
            collections?.trending?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} href="/collection" passHref>
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'art' &&
            collections?.art?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} href="/collection" passHref>
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'charity' &&
            collections?.charity?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} href="/collection" passHref>
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'gaming' &&
            collections?.gaming?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} href="/collection" passHref>
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'utility' &&
            collections?.utility?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} href="/collection" passHref>
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}
        </div>
      </div>
    </div>
  );
};

export default ExploreCollections;
