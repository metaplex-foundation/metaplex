import { useStore } from '@oyster/common';
import React from 'react';
import { useMeta } from '../../contexts';
import { AuctionListView } from './auctionList';
import { SetupView } from './setup';

export const HomeView = () => {
  const { isLoading, store } = useMeta();
  const { isConfigured } = useStore();

  const showAuctions = (store && isConfigured) || isLoading;

  return showAuctions ? <AuctionListView /> : <SetupView />;
};
