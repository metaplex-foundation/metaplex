import { useMemo } from 'react';

import { LiveAuctionViewState } from '../..';
import { useAuctionsList } from '../useAuctionsList';
import { sortSalesByDate } from './utils';
import { Sale } from '../../types';

export const useSales = (
  activeKey: LiveAuctionViewState,
): {
  sales: Array<Sale>;
  hasResaleAuctions: boolean;
} => {
  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);

  const sales = useMemo(() => {
    return sortSalesByDate([...auctions]);
  }, [activeKey, auctions]);

  return { sales, hasResaleAuctions };
};
