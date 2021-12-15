import { PackDistributionType } from '@oyster/common';
import { Keypair } from '@solana/web3.js';
import { BN } from 'bn.js';
import { notification } from 'antd';

import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { MAX_PACKS_CREATION_COUNT } from '../../constants';
import {
  MapSelectedItemsParams,
  MapSelectedVouchersParams,
  SelectedItem,
  SelectedVoucher,
} from './interface';

export const isItemInPackFilter = (
  selectedItems: Record<string, SafetyDepositDraft>,
  item: SafetyDepositDraft,
) => selectedItems[item.metadata.pubkey];

export const masterEditionFilter = ({ edition }: SafetyDepositDraft): boolean =>
  !edition;

export const limitedSupplyFilter = ({
  masterEdition,
}: SafetyDepositDraft): boolean => !!masterEdition?.info.maxSupply?.toNumber();

export const unlimitedSupplyFilter = ({
  masterEdition,
}: SafetyDepositDraft): boolean => masterEdition?.info.maxSupply === undefined;

export const hasSupplyFilter = ({
  masterEdition,
}: SafetyDepositDraft): boolean => !!masterEdition?.info.supply?.toNumber();

export const nonUniqueItemFilter = (item: SafetyDepositDraft) =>
  unlimitedSupplyFilter(item) || limitedSupplyFilter(item);

export const packItemsFilter =
  (selectedItems: Record<string, SafetyDepositDraft>, isUnlimited: boolean) =>
  (item: SafetyDepositDraft) => {
    if (Object.values(selectedItems).length === 0) {
      return nonUniqueItemFilter(item) && masterEditionFilter(item);
    }

    const shouldShowItemBasedOnSupply = isUnlimited
      ? unlimitedSupplyFilter(item)
      : limitedSupplyFilter(item);

    return shouldShowItemBasedOnSupply && masterEditionFilter(item);
  };

export const vouchersFilter =
  (selectedItems: Record<string, SafetyDepositDraft>) =>
  (item: SafetyDepositDraft) =>
    !isItemInPackFilter(selectedItems, item) &&
    nonUniqueItemFilter(item) &&
    masterEditionFilter(item) &&
    hasSupplyFilter(item);

export const mapSelectedItems = ({
  selectedItems,
  supplyByMetadataKey,
  weightByMetadataKey,
  accountByMint,
  distributionType,
}: MapSelectedItemsParams): SelectedItem[] =>
  Object.keys(selectedItems).map((pubKey, index) => {
    const { mint } = selectedItems[pubKey].metadata.info;
    const tokenAccount = accountByMint.get(mint);

    if (!tokenAccount)
      throw new Error(`No token account for the metadata: ${pubKey}`);

    const maxSupply =
      distributionType !== PackDistributionType.Unlimited &&
      supplyByMetadataKey[pubKey]
        ? new BN(supplyByMetadataKey[pubKey])
        : new BN(0);
    const weight =
      distributionType !== PackDistributionType.MaxSupply &&
      weightByMetadataKey[pubKey]
        ? new BN(weightByMetadataKey[pubKey])
        : new BN(0);
    const toAccount = Keypair.generate();

    return {
      index: index + 1, // Packs indexing starts from 1
      mint,
      maxSupply,
      weight,
      tokenAccount,
      toAccount,
    };
  });

export const mapSelectedVouchers = ({
  selectedVouchers,
  accountByMint,
}: MapSelectedVouchersParams): SelectedVoucher[] =>
  Object.keys(selectedVouchers).map((pubKey, index) => {
    const { mint } = selectedVouchers[pubKey].metadata.info;
    const tokenAccount = accountByMint.get(mint);

    if (!tokenAccount)
      throw new Error(`No token account for the metadata: ${pubKey}`);

    return {
      index: index + 1, // Packs indexing starts from 1
      mint,
      tokenAccount,
    };
  });

export const exceededPacksCountNotification = (): void => {
  notification.warning({
    message: 'Exceeded Max Selected Count!',
    description: `Maximum ${MAX_PACKS_CREATION_COUNT} items can be selected.`,
    className: 'notification-container',
  });
};
