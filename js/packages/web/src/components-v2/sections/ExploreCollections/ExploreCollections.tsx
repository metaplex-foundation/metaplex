import React, { FC } from 'react';
import CN from 'classnames';
import queryString from 'query-string';
import { useHistory, Link, useLocation } from 'react-router-dom';

import { categories } from '../../../../dummy-data/categories';
import { collections } from '../../../../dummy-data/explore-collections';

import { NftCard } from '../../molecules/NftCard';
import { TextField } from '../../atoms/TextField';
import { TabHighlightButton } from '../../atoms/TabHighlightButton';

export interface ExploreCollectionsProps {
  [x: string]: any;
}

export const ExploreCollections: FC<ExploreCollectionsProps> = ({
  className,
  ...restProps
}: ExploreCollectionsProps) => {
  const { push } = useHistory();
  const { search } = useLocation();
  const { pid } = queryString.parse(search) || {};

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
              <TabHighlightButton
                isActive={pid === value}
                key={value || index}
                onClick={() => {
                  push(`/explore?pid=${value}`);
                }}
              >
                {label}
              </TabHighlightButton>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-x-[32px] gap-y-[32px] pb-[100px]">
          {pid === 'trending' &&
            collections?.trending?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} to="/collection">
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'collectibles' &&
            collections?.trending?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} to="/collection">
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'art' &&
            collections?.art?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} to="/collection">
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'charity' &&
            collections?.charity?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} to="/collection">
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'gaming' &&
            collections?.gaming?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} to="/collection">
                    <NftCard {...restProps} />
                  </Link>
                );
              },
            )}

          {pid === 'utility' &&
            collections?.utility?.map(
              ({ id, ...restProps }: any, index: number) => {
                return (
                  <Link key={id || index} to="/collection">
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
