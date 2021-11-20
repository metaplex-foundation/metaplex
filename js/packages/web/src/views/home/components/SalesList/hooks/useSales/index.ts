import { useMemo } from 'react';

import { LiveAuctionViewState } from '../..';
import { useAuctionsList } from '../useAuctionsList';
import { usePacksList } from '../usePacksList';
import { sortSalesByDate } from './utils';
import { Sale } from '../../types';

export const useSales = (
  activeKey: LiveAuctionViewState,
): {
  sales: Array<Sale>;
  hasResaleAuctions: boolean;
} => {
  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);
  const packs = usePacksList();

  const sales = useMemo(() => {
    const activePacks = [
      LiveAuctionViewState.All,
      LiveAuctionViewState.Ended,
    ].includes(activeKey)
      ? packs
      : [];

    return sortSalesByDate([...auctions, ...activePacks]);
  }, [activeKey, auctions, packs]);

  return { sales, hasResaleAuctions };
};
