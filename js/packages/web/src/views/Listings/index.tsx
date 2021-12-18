import { useStore } from '@oyster/common';
import React, { useEffect } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Alert, Button, Spin, Anchor, Menu, Row, Col, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  useAuctionManagersToCache,
} from '../../hooks';
import { Banner } from './../../components/Banner';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { MetaplexMasonry } from './../../components/MetaplexMasonry';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { useSearchParams } from 'react-router-dom';
import {
  useInfiniteScrollAuctions,
} from '../../hooks';

export const Listings = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get("view") as string;
  const { ownerAddress, storefront } = useStore();
  const wallet = useWallet();
  const { auctionManagerTotal, auctionCacheTotal } =
    useAuctionManagersToCache();
  const isStoreOwner = ownerAddress === wallet.publicKey?.toBase58();
  const notAllAuctionsCached = auctionManagerTotal !== auctionCacheTotal;
  const showCacheAuctionsAlert = isStoreOwner && notAllAuctionsCached;

  const { auctions, loading, initLoading, hasNextPage, loadMore } =
    useInfiniteScrollAuctions(view);

  const [sentryRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: loadMore,
    rootMargin: '0px 0px 200px 0px',
  });

  useEffect(() => {
    if (!view) {
      setSearchParams({ view: "live" });
    }
  }, [view]);

  return initLoading ? (
    <div className="app-section--loading">
      <Spin indicator={<LoadingOutlined />} />
    </div>
  ) : (
    <>
      {showCacheAuctionsAlert && (
        <Alert
          message="Attention Store Owner"
          className="app-alert-banner metaplex-spacing-bottom-lg"
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
      />
      <Anchor showInkInFixed={false}>
        <Menu
          className="metaplex-menu-pills"
          onClick={(e: any) => {
            setSearchParams({ view: e.key });
          }}
          selectedKeys={[view]}
          mode="horizontal"
        >
          <Menu.Item key="live">
            Live
          </Menu.Item>
          <Menu.Item key="resale">
            Secondary Listings
          </Menu.Item>
          <Menu.Item key="ended">
            Ended
          </Menu.Item>
        </Menu>
      </Anchor>
      <MetaplexMasonry>
        {auctions.map((m) => {
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
  );
};
