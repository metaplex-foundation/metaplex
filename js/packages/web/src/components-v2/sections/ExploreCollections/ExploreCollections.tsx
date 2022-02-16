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
// import { LiveAuctionViewState } from '../../../views/home/components/SalesList';
// import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList';
// import { IMetadataExtension, useLocalStorage } from '@oyster/common';
import { useItems } from '../../../views/artworks/hooks/useItems';
import { ArtworkViewState } from '../../../views/artworks/types';

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
  // const { pullItemsPage, isFetching, pullAllMetadata } = useMeta();
  // const { userAccounts } = useUserAccounts();

  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex);
  // const { auctions } = useAuctionsList(activeKey); //  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);

  const userItems = useItems({ activeKey });
  // const [data, setData] = useState<IMetadataExtension>();

  // useEffect(() => {
  //   if (!isFetching) {
  //     pullItemsPage(userAccounts);
  //     // pullAllMetadata();
  //   }
  // }, [isFetching]);
  const initialValue: any[] = [];
  const [dataItems, setDataItems] = useState(initialValue);
  useEffect(() => {
    const getUserItems = async () => {
      const tempArray: any[] = [];
      for (const element of userItems) {
        tempArray.push(
          await getMoreData(
            (element as any).pubkey,
            (element as any)?.info?.data?.uri,
          ),
        );
      }
      setDataItems(tempArray);
    };
    getUserItems();
  }, [userItems]);

  const getMoreData = async (id, itemuri) => {
    // const localStorage = useLocalStorage();
    console.log(id);
    const USE_CDN = false;
    const routeCDN = (uri: string) => {
      let result = uri;
      if (USE_CDN) {
        result = uri.replace(
          'https://arweave.net/',
          'https://coldcdn.com/api/cdn/bronil/',
        );
      }

      return result;
    };

    if (itemuri) {
      const uri = routeCDN(itemuri);

      const processJson = (extended: any) => {
        if (!extended || extended?.properties?.files?.length === 0) {
          return;
        }

        if (extended?.image) {
          const file = extended.image.startsWith('http')
            ? extended.image
            : `${itemuri}/${extended.image}`;
          extended.image = routeCDN(file);
        }

        return extended;
      };
      const data = await fetch(uri);
      const rdata = processJson(data.json());
      return rdata;
    }
  };

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Metaplex);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

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
            dataItems.map((item: any) => {
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
            dataItems.map((item: any) => {
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
            dataItems.map((item: any) => {
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
            dataItems.map((item: any) => {
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
            dataItems.map((item: any) => {
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
            dataItems.map((item: any) => {
              console.log(item);
              // const pubkey = isMetadata(item)
              //   ? item.pubkey
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // console.log(getMoreData(pubkey, item?.info?.data?.uri));
              // const pubkey = isMetadata(item)
              //   ? item.pubkey
              //   : isPack(item)
              //   ? item.provingProcessKey
              //   : item.edition?.pubkey || item.metadata.pubkey;
              // const extra = getMoreData(pubkey);
              // console.log(extra);
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
