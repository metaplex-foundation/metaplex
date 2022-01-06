import { useStore, View } from '@oyster/common';
import React, { useEffect } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Alert, Button, Spin, Anchor } from 'antd';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuctionManagersToCache } from '../../hooks';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { MetaplexMasonry } from './../../components/MetaplexMasonry';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteScrollAuctions } from '../../hooks';
import { Banner } from './../../components/Banner';

export const Listings = () => {
  const { storefront } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get('view') as View;
  const { ownerAddress } = useStore();
  const wallet = useWallet();
  const { auctionManagerTotal, auctionCacheTotal } =
    useAuctionManagersToCache();
  const isStoreOwner = ownerAddress === wallet.publicKey?.toBase58();
  const notAllAuctionsCached = auctionManagerTotal !== auctionCacheTotal;
  const showCacheAuctionsAlert = isStoreOwner && notAllAuctionsCached;

  const {
    auctions,
    loading,
    hasNextPage,
    initLoading,
    loadMore,
    auctionsCount,
  } = useInfiniteScrollAuctions(view);

  const [sentryRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: loadMore,
    rootMargin: '0px 0px 200px 0px',
  });

  const showCount = (view: View) =>
    auctionsCount[view] != null ? (
      auctionsCount[view]
    ) : (
      <Spin size="small" indicator={<LoadingOutlined />} />
    );

  const currentViewIsEmpty = () =>
    views.filter(x => x.key === view)[0]?.count() === 0;

  useEffect(() => {
    // makes sure cards load when switching back to listings from another page
    setSearchParams({
      view: view || View.live,
    });
    // auto-forwards to first listings view with matching listings
    if (currentViewIsEmpty()) {
      console.log('current view is empty');
      setSearchParams({
        view: views.find(x => x.count() > 0)?.key || View.live,
      });
    }
  }, [view, loading, auctionsCount]);

  const views = [
    {
      key: 'live',
      title: 'Live',
      count: () => showCount(View.live) || 0,
    },
    {
      key: 'resale',
      title: 'Secondary',
      count: () => showCount(View.resale) || 0,
    },
    {
      key: 'ended',
      title: 'Ended',
      count: () => showCount(View.ended) || 0,
    },
  ];

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
      />
      <Anchor showInkInFixed={false} className="metaplex-anchor">
        <div className="listings-menu-wrapper">
          {views.map(({ key, title, count }) => {
            return (
              <button
                key={key}
                className={
                  'listings-menu-item' + (view === key ? ' active' : '')
                }
                onClick={() => setSearchParams({ view: key })}
                disabled={count() === 0}
              >
                {title} <span className="auctions-count">| {count()}</span>
              </button>
            );
          })}
        </div>
      </Anchor>
      {initLoading ? (
        <div className="app-section--loading">
          <Spin indicator={<LoadingOutlined />} />
        </div>
      ) : (
        <>
          <MetaplexMasonry>
            {auctions.map(m => {
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
