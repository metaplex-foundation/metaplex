import { PackDistributionType } from '@oyster/common';
import { PackState } from '../interface';
import { CreatePackSteps } from '../types';

const hasMappedPubkeys = (
  pubkeys: string[],
  mappedPubkeys: string[],
): boolean => pubkeys.every(element => mappedPubkeys.includes(element));

const isValidQuantities = (attributes: PackState) => {
  const {
    allowedAmountToRedeem,
    distributionType,
    selectedItems,
    weightByMetadataKey,
    supplyByMetadataKey,
  } = attributes;

  const isValidAmountOfCardsInPack = allowedAmountToRedeem > 0;
  const selectedItemsPubkeys = Object.keys(selectedItems);

  const hasMappedSupply = (): boolean =>
    hasMappedPubkeys(selectedItemsPubkeys, Object.keys(supplyByMetadataKey));
  const hasMappedWeight = (): boolean =>
    hasMappedPubkeys(selectedItemsPubkeys, Object.keys(weightByMetadataKey));

  switch (distributionType) {
    case PackDistributionType.Unlimited:
      return isValidAmountOfCardsInPack && hasMappedWeight();
    case PackDistributionType.MaxSupply:
      return isValidAmountOfCardsInPack && hasMappedSupply();
    case PackDistributionType.Fixed:
      return (
        isValidAmountOfCardsInPack && hasMappedSupply() && hasMappedWeight()
      );
  }
};

export const useValidation = ({
  attributes,
  step,
}: {
  attributes: PackState;
  step: CreatePackSteps;
}): boolean => {
  const { selectedItems, selectedVouchers } = attributes;

  switch (step) {
    case CreatePackSteps.SelectItems:
      return Object.values(selectedItems).length > 0;
    case CreatePackSteps.SelectVoucher:
      return Object.values(selectedVouchers).length > 0;
    case CreatePackSteps.AdjustQuantities:
      return isValidQuantities(attributes);
    // case CreatePackSteps.DesignAndInfo:
    //   return !!(name && description && uri);
    default:
      return true;
  }
};
