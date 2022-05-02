import { PackState } from '../../interface';

export enum InputType {
  weight = 'weight',
  maxSupply = 'maxSupply',
}

export interface AdjustQuantitiesStepProps
  extends Pick<
    PackState,
    | 'allowedAmountToRedeem'
    | 'distributionType'
    | 'selectedItems'
    | 'weightByMetadataKey'
    | 'supplyByMetadataKey'
  > {
  setPackState: (values: Partial<PackState>) => void;
  isUnlimited: boolean;
}
