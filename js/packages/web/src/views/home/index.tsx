import { Layout } from 'antd';
import React from 'react';
import { useStore } from '@oyster/common';
import { useMeta } from '../../contexts';
import { AuctionListView } from './auctionList';
import { SetupView } from './setup';


export const HomeView = () => {
  const { isLoading, store } = useMeta();
  const { isConfigured } = useStore();
  const showAuctions = (store && isConfigured) || isLoading;
  <span className="FAQ">
    <h2>This is how long the auction will last for.</h2>
  </span>
  return ( 
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
      {showAuctions ? <AuctionListView /> : <SetupView />}
    </Layout>
  );

};
