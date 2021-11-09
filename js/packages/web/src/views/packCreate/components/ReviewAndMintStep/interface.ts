import { InfoFormState, PackState } from '../../interface';

export interface ReviewAndMintStepProps
  extends InfoFormState,
    Pick<
      PackState,
      'allowedAmountToRedeem' | 'supplyByMetadataKey' | 'distributionType'
    > {}
