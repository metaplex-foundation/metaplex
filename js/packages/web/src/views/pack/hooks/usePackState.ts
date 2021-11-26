import { useMeta, useUserAccounts } from '@oyster/common';
import { useEffect, useMemo, useState } from 'react';

import { SafetyDepositDraft } from '../../../actions/createAuctionManager';

import { useOpenedMetadata } from './useOpenedMetadata';

export const usePackState = (
  packKey: string,
): {
  packMetadata: SafetyDepositDraft[];
  mockBlocks: number[];
  isLoading: boolean;
  handleFetch: () => Promise<void>;
} => {
  const [isLoading, setIsLoading] = useState(false);
  const { packs, packCardsByPackSet, pullPackPage } = useMeta();
  const { userAccounts } = useUserAccounts();

  const packCards = packCardsByPackSet[packKey];
  const openedMetadata = useOpenedMetadata(packCards);

  const pack = packs[packKey];

  // ToDo: Fixme by finding proving process by key
  const cardsRedeemed = 0;
  const total = pack?.info?.allowedAmountToRedeem || 0;
  const cardsLeftToOpen = total - cardsRedeemed;
  const mockBlocks = useMemo(
    () => Array.from({ length: cardsLeftToOpen }, (v, i) => i + cardsRedeemed),
    [cardsLeftToOpen, cardsRedeemed],
  );
  const packMetadata = cardsRedeemed
    ? openedMetadata.slice(0, cardsRedeemed)
    : [];

  const handleFetch = async () => {
    setIsLoading(true);

    await pullPackPage(userAccounts, packKey);

    setIsLoading(false);
  };

  useEffect(() => {
    handleFetch();
  }, []);

  return {
    mockBlocks,
    packMetadata,
    isLoading,
    handleFetch,
  };
};
