import { Layout } from 'antd';
import React from 'react';
import { useStore } from '@oyster/common';
import { useMeta } from '../../contexts';
import { Redirect } from 'react-router';

export const HomeView = () => {
  const { isLoading, store } = useMeta();
  const { isConfigured } = useStore();

  const showAuctions = (store && isConfigured) || isLoading;
  
  return (
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
      {showAuctions ? 'Home page (TODO)' : <Redirect to="/auctions" />}
    </Layout>
  );
};
