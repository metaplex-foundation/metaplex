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
import { useInfiniteScrollAuctions, useGroupedAuctions } from '../../hooks';
import { Banner } from './../../components/Banner';
import cx from 'classnames';

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

  const { groups, fetching } = useGroupedAuctions();
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
        <div className="listings-menu-wrapper">
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
      </Anchor>
      {fetching ? (
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
