import { Layout } from 'antd';
import React from 'react';
// import { useStore } from '@oyster/common';
// import { useMeta } from '../../contexts';
import { SalesListView } from './components/SalesList';

export const HomeView = () => {
  // const { isLoading, store } = useMeta();
  // const { isConfigured } = useStore();

  // const showAuctions = (store && isConfigured) || isLoading;

  return (
    <Layout
      style={{
        margin: 0,
        alignItems: 'center',
        backgroundColor: 'white !important',
      }}
    >
      <SalesListView />
      {/* {showAuctions ? <SalesListView /> : <SetupView />} */}
    </Layout>
  );
};
