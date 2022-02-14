import CN from 'classnames';
import queryString from 'query-string';
import { useHistory, useLocation } from 'react-router-dom';

import { categories } from '../../../../dummy-data/categories';

import { TextField } from '../../atoms/TextField';
import { TabHighlightButton } from '../../atoms/TabHighlightButton';

import { useWallet } from '@solana/wallet-adapter-react';
import React, { useEffect, useState, FC } from 'react';
// import { useMeta } from '../../../contexts';

// import { useUserAccounts } from '@oyster/common';
// import { isMetadata } from '../../../views/artworks/utils';
import { LiveAuctionViewState } from '../../../views/home/components/SalesList';
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList';

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

  ///////////////
  const { connected } = useWallet();
  // const { isLoading, isFetching } = useMeta();
  // const { userAccounts } = useUserAccounts();

  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { auctions } = useAuctionsList(activeKey); //  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);

  // const userItems = useItems({ activeKey });

  // useEffect(() => {
  //   if (!isFetching) {
  //     pullItemsPage(userAccounts);
  //   }
  // }, [isFetching]);

  useEffect(() => {
    if (connected) {
      setActiveKey(LiveAuctionViewState.All);
    } else {
      setActiveKey(LiveAuctionViewState.All);
    }
  }, [connected, setActiveKey]);

  // const isDataLoading = isLoading || isFetching;

  ///////////////

  ///// get auctions  ///////////

  // const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);

  ///// end auctions ///////////

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
            auctions.map((item: any) => {
              console.log(item);
              // const pubkey = isMetadata(item)
              //   ? item.pubkey
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // const temp = {
              //   name: item?.info?.data?.symbol,
              //   description: item?.info?.data?.name,
              //   itemsCount: 1, //hardcoded
              //   floorPrice: 100,
              //   isVerified: 1,
              //   image: item?.info?.data?.uri,
              // };
              // return (
              //   <Link key={pubkey} to="/collection">
              //     <NftCard {...temp} />
              //   </Link>
              // );
            })}

          {pid === 'collectibles' &&
            auctions.map((item: any) => {
              console.log(item);
              // const pubkey = isMetadata(item)
              //   ? item.pubkey
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // const temp = {
              //   name: item?.info?.data?.symbol,
              //   description: item?.info?.data?.name,
              //   itemsCount: 1, //hardcoded
              //   floorPrice: 100,
              //   isVerified: 1,
              //   image: item?.info?.data?.uri,
              // };
              // return (
              //   <Link key={pubkey} to="/collection">
              //     <NftCard {...temp} />
              //   </Link>
              // );
            })}

          {pid === 'art' &&
            auctions.map((item: any) => {
              console.log(item);
              // const pubkey = isMetadata(item)
              //   ? item.pubkey
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // const temp = {
              //   name: item?.info?.data?.symbol,
              //   description: item?.info?.data?.name,
              //   itemsCount: 1, //hardcoded
              //   floorPrice: 100,
              //   isVerified: 1,
              //   image: item?.info?.data?.uri,
              // };
              // return (
              //   <Link key={pubkey} to="/collection">
              //     <NftCard {...temp} />
              //   </Link>
              // );
            })}

          {pid === 'charity' &&
            auctions.map((item: any) => {
              console.log(item);
              // const pubkey = isMetadata(item)
              //   ? item.pubkey
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // debugger;
              // const temp = {
              //   name: item?.info?.data?.symbol,
              //   description: item?.info?.data?.name,
              //   itemsCount: 1, //hardcoded
              //   floorPrice: 100,
              //   isVerified: 1,
              //   image: item?.info?.data?.uri,
              // };
              // return (
              //   <Link key={pubkey} to="/collection">
              //     <NftCard {...temp} />
              //   </Link>
              // );
            })}

          {pid === 'gaming' &&
            auctions.map((item: any) => {
              console.log(item);
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // const temp = {
              //   name: item?.info?.data?.symbol,
              //   description: item?.info?.data?.name,
              //   itemsCount: 1, //hardcoded
              //   floorPrice: 100,
              //   isVerified: 1,
              //   image: item?.info?.data?.uri,
              // };
              // return (
              //   <Link key={pubkey} to="/collection">
              //     <NftCard {...temp} />
              //   </Link>
              // );
            })}

          {pid === 'utility' &&
            auctions.map((item: any) => {
              console.log(item);
              // const pubkey = isMetadata(item)
              //   ? item.pubkey
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // const temp = {
              //   name: item?.info?.data?.symbol,
              //   description: item?.info?.data?.name,
              //   itemsCount: 1, //hardcoded
              //   floorPrice: 100,
              //   isVerified: 1,
              //   image: item?.info?.data?.uri,
              // };
              // return (
              //   <Link key={pubkey} to="/collection">
              //     <NftCard {...temp} />
              //   </Link>
              // );
            })}
        </div>
      </div>
    </div>
  );
};

export default ExploreCollections;
