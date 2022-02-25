import { useMeta, useStore, View } from '@oyster/common';
import React, { useEffect, useMemo, useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Alert, Anchor, Button, Card, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { AuctionView, useAuctionManagersToCache } from '../../hooks';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { MetaplexMasonry } from './../../components/MetaplexMasonry';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteScrollAuctions, useGroupedAuctions } from '../../hooks';
import { Banner } from './../../components/Banner';
import cx from 'classnames';
import { SearchIcon } from '@heroicons/react/solid';
import { Switch } from '@headlessui/react';

export const Listings = () => {
  const { storefront } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { whitelistedCreatorsByCreator, store } = useMeta();
  const view = searchParams.get('view') as View;
  const { ownerAddress } = useStore();
  const wallet = useWallet();
  const { auctionManagerTotal, auctionCacheTotal } =
    useAuctionManagersToCache();
  const pubkey = wallet.publicKey?.toBase58() || '';
  const isStoreOwner = ownerAddress === pubkey;
  const notAllAuctionsCached = auctionManagerTotal !== auctionCacheTotal;
  const showCacheAuctionsAlert = isStoreOwner && notAllAuctionsCached;
  const [showAllEndedListings, setShowAllEndedListings] = useState(false);
  const [listingNameFilter, setListingNameFilter] = useState('');

  const { groups, fetching } = useGroupedAuctions({
    showAllEndedListings,
  });
  const activeGroup = groups[view] || [];

  const { auctions, loading, hasNextPage, loadMore } =
    useInfiniteScrollAuctions(activeGroup, view);

  const [sentryRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: loadMore,
    rootMargin: '0px 0px 200px 0px',
  });

  useEffect(() => {
    if (fetching) {
      return;
    }

    if (activeGroup.length > 0) {
      return;
    }

    if (groups[View.live].length > 0) {
      setSearchParams({
        view: View.live,
      });

      return;
    }

    if (groups[View.resale].length > 0) {
      setSearchParams({
        view: View.resale,
      });

      return;
    }

    setSearchParams({
      view: View.ended,
    });
  }, [fetching, groups]);

  const views = [
    {
      key: View.live,
      title: 'Live',
    },
    {
      key: View.resale,
      title: 'Secondary',
    },
    {
      key: View.ended,
      title: 'Ended',
    },
  ];

  const showShowAllEndedListingsToggle = view === View.ended;

  const filteredAuctions: AuctionView[] = auctions.filter(
    a =>
      !listingNameFilter ||
      a?.thumbnail?.metadata?.info?.data?.name
        ?.toLowerCase()
        .includes(listingNameFilter.toLowerCase()),
  );

  const canList = useMemo(() => {
    return (
      store?.info?.public ||
      whitelistedCreatorsByCreator[pubkey]?.info?.activated
    );
  }, [pubkey, whitelistedCreatorsByCreator, store]);

  return (
    <>
      {showCacheAuctionsAlert && (
        <Alert
          message="Attention Store Owner"
          className="app-alert-banner metaplex-margin-bottom-8"
          description={
            <p>
              Make your storefront faster by enabling listing caches.{' '}
              {auctionCacheTotal}/{auctionManagerTotal} of your listing have a
              cache account. Watch this{' '}
              <a
                rel="noopener noreferrer"
                target="_blank"
                href="https://youtu.be/02V7F07DFbk"
              >
                video
              </a>{' '}
              for more details and a walkthrough. On November 17rd storefronts
              will start reading from the cache for listings. All new listing
              are generating a cache account.
            </p>
          }
          type="info"
          showIcon
          action={
            <Link to="/admin">
              <Button>Visit Admin</Button>
            </Link>
          }
        />
      )}

      <Banner
        src={storefront.theme.banner}
        headingText={storefront.meta.title}
        subHeadingText={storefront.meta.description}
        logo={storefront?.theme?.logo || ''}
        twitterVerification={storefront.integrations?.twitterVerification}
        ownerAddress={ownerAddress}
      />
      <Anchor showInkInFixed={false} className="metaplex-anchor">
        <div className="flex justify-between flex-wrap">
          <div className="listings-menu-wrapper w-full sm:w-auto justify-between mt-2 ">
            {views.map(({ key, title }) => {
              const count = groups[key].length;

              return (
                <button
                  key={key}
                  className={cx('listings-menu-item', { active: view === key })}
                  onClick={() => setSearchParams({ view: key })}
                  disabled={count === 0}
                >
                  {title} <span className="auctions-count">| {count}</span>
                </button>
              );
            })}
          </div>
          <div
            className={cx('flex items-center max-w-full md:max-w-sm mt-2', {
              'w-full transition-all': true,
            })}
          >
            <div className="w-full">
              <label
                htmlFor="listings-search"
                className="block text-sm font-medium text-gray-700 sr-only"
              >
                Listings search
              </label>
              <div className="relative rounded-md transition-all group opacity-50 focus-within:opacity-100">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-all">
                  <SearchIcon
                    className="h-5 w-5 text-color-text opacity-50 group-focus:opacity-100 z-50"
                    aria-hidden="true"
                  />
                </div>
                <input
                  type="search"
                  name="listings-search"
                  id="listings-search"
                  value={listingNameFilter}
                  onChange={e => setListingNameFilter(e.target.value)}
                  className={cx(
                    'bg-base text-color-text py-2 px-4 ring-0 opacity-50 focus:opacity-100 outline-none transition-all',
                    'block w-full pl-10 sm:text-sm border border-color-text rounded-lg max-w-full',
                    view === View.ended ? 'md:max-w-xs' : 'md:max-w-sm',
                  )}
                  placeholder="Search"
                />
              </div>
            </div>
            {showShowAllEndedListingsToggle && (
              <div className="flex ml-8 w-full max-w-fit">
                <span className="opacity-50">Show all</span>
                <Switch
                  checked={showAllEndedListings}
                  onChange={setShowAllEndedListings}
                  className={`ml-4 ${
                    showAllEndedListings ? 'bg-primary' : 'bg-base-bold'
                  } relative inline-flex items-center h-6 rounded-full w-11`}
                >
                  <span className="sr-only">Show all listings</span>
                  <span
                    className={`${
                      showAllEndedListings ? 'translate-x-6' : 'translate-x-1'
                    } inline-block w-4 h-4 transform transition bg-white rounded-full`}
                  />
                </Switch>
              </div>
            )}
          </div>
        </div>
      </Anchor>
      {fetching ? (
        <div className="app-section--loading">
          <Spin indicator={<LoadingOutlined />} />
        </div>
      ) : (
        <>
          {!filteredAuctions.length && !fetching && !hasNextPage && (
            <Card>
              <div className="text-center text-color-text">
                <h3 className="mt-2 text-2xl font-medium ">
                  No listings found
                </h3>
                <p className="mt-1 text-sm opacity-75">
                  {/* {listingNameFilter.length
                ? 'Try a different one'
                : "Create a listing to have it show up here. If you don't have an NFT to list, you can mint a new one."} */}
                </p>
                {canList && (
                  <>
                    <p className="mt-1 text-sm opacity-75">
                      Get started by creating a listing
                    </p>
                    <div className="mt-6 flex space-x-4 justify-center">
                      <Link to="/listings/new/0">
                        <Button size="large" type="primary">
                          Create a listing
                        </Button>
                      </Link>
                      <Link to="/owned">
                        <Button size="large" type={'primary'} className="">
                          Mint NFTs
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
          <MetaplexMasonry>
            {filteredAuctions.map(m => {
              const id = m.auction.pubkey;
              return (
                <Link to={`/listings/${id}`} key={id}>
                  <AuctionRenderCard key={id} auctionView={m} />
                </Link>
              );
            })}
          </MetaplexMasonry>
          {hasNextPage && (
            <div key="more" className="app-section--loading" ref={sentryRef}>
              <Spin indicator={<LoadingOutlined />} />
            </div>
          )}
        </>
      )}
    </>
  );
};
