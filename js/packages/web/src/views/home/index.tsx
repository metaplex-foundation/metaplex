import { Layout } from 'antd';
import React from 'react';
import { useStore } from '@oyster/common';
import { useMeta } from '../../contexts';
import { AuctionListView } from './auctionList';
import { PurchaseArt } from './purchaseArt';
import { SetupView } from './setup';

const showPurchase = true;

export const HomeView = () => {
  const { isLoading, store } = useMeta();
  const { isConfigured } = useStore();

  const showAuctions = (store && isConfigured) || isLoading;

  const view = () => {
    if (showPurchase) return <PurchaseArt />;
    else if (showAuctions) return <AuctionListView />;
    else return <SetupView />;
  }

  return (
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
      {view()}
    </Layout>
  );
};
