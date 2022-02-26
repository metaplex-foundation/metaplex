import { useEffect, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import { useAuctions, AuctionView } from '../../../../../../hooks';

import { LiveAuctionViewState } from '../..';
import { getFilterFunction, resaleAuctionsFilter } from './utils';
import { useMeta } from '@oyster/common';

export const useAuctionsList = (
  activeKey: LiveAuctionViewState,
): { auctions: AuctionView[]; hasResaleAuctions: boolean } => {
  const { publicKey } = useWallet();
  const auctions = useAuctions();
  const { pullAuctionListData, isLoading } = useMeta();

  useEffect(() => {
    if (!auctions.length || isLoading) return;
    for (const auction of auctions) {
      pullAuctionListData(auction.auction.pubkey);
    }
  }, [auctions.length, isLoading]);

  const filteredAuctions = useMemo(() => {
    const filterFn = getFilterFunction(activeKey);

    return auctions.filter(auction => filterFn(auction, publicKey));
  }, [activeKey, auctions, publicKey]);

  const hasResaleAuctions = useMemo(() => {
    return auctions.some(auction => resaleAuctionsFilter(auction));
  }, [auctions]);

  return { auctions: filteredAuctions, hasResaleAuctions };
};
