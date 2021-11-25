import { useMeta, useUserAccounts } from '@oyster/common';
import { useEffect, useMemo, useState } from 'react';
import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { useUserVouchersByEdition } from '../../artworks/hooks/useUserVouchersByEdition';
import { useOpenedMetadata } from './useOpenedMetadata';

export const usePackState = (
  packKey: string,
  voucherEditionKey: string,
): {
  packMetadata: SafetyDepositDraft[];
  mockBlocks: number[];
  isLoading: boolean;
  handleFetch: () => Promise<void>;
} => {
  const [isLoading, setIsLoading] = useState(false);
  const { packs, packCardsByPackSet, provingProcesses, pullPackPage } =
    useMeta();
  const userVouchers = useUserVouchersByEdition();
  const { userAccounts } = useUserAccounts();

  const packCards = packCardsByPackSet[packKey];
  const openedMetadata = useOpenedMetadata(packCards);

  const pack = packs[packKey];
  const voucher = userVouchers[voucherEditionKey];
  const provingProcess = useMemo(
    () =>
      Object.values(provingProcesses).find(
        ({ info: { voucherMint, packSet } }) =>
          voucherMint === voucher.mint && packSet === packKey,
      ),
    [provingProcesses, voucher, packKey],
  );

  const cardsRedeemed = provingProcess?.info.cardsRedeemed || 0;
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
