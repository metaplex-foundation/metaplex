import React from 'react';
import { Layout, Alert, Button } from 'antd';
import { Link, useLocation } from 'react-router-dom'
import { AppBar } from '../AppBar';
import useWindowDimensions from '../../utils/layout';
import { useStore } from '@oyster/common';
import { useAuctionManagersToCache } from '../../hooks';
import { useWallet } from '@solana/wallet-adapter-react';
const { Header, Content } = Layout;

const paddingForLayout = (width: number) => {
  if (width <= 768) return '5px 10px';
  if (width > 768) return '10px 30px';
};

export const AppLayout = React.memo((props: any) => {
  const { width } = useWindowDimensions();
  const { ownerAddress } = useStore();
  const wallet = useWallet();
  const location = useLocation();
  const { auctionManagerTotal, auctionCacheTotal } = useAuctionManagersToCache();
  const isStoreOwner = ownerAddress === wallet.publicKey?.toBase58();
  const notAllAuctionsCached = auctionManagerTotal !== auctionCacheTotal;
  const notAdminPage = location.pathname !== '/admin';
  const showCacheAuctionsAlert =  isStoreOwner && notAllAuctionsCached;

  return (
    <>
      <Layout
        style={{
          padding: paddingForLayout(width),
          maxWidth: 1440,
        }}
      >
        <Header className="App-Bar">
          <AppBar />
        </Header>
        <Content>
          {showCacheAuctionsAlert && (
            <Alert
              message="Attention Store Owner"
              className="app-alert-banner"
              description={(
                <p>
                  Make your storefront faster by enabling listing caches. {auctionCacheTotal}/{auctionManagerTotal} of your listing have a cache account. Watch this <a rel="noopener noreferrer" target="_blank" href="https://www.loom.com/share/aafbd28d594e4ee6a4c1844faa8ea918">video</a> for more details and a walkthrough. On October 29th storefronts will start reading from the cache for listings. All new listing are generating a cache account.
                </p>
              )}
              type="info"
              showIcon
              action={
                notAdminPage && (
                  <Link to="/admin">
                    <Button>Visit Admin</Button>
                  </Link>
                )
              }
            />
          )}
          {props.children}
        </Content>
      </Layout>
    </>
  );
});
