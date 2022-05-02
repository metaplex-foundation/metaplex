import { CreatePackSteps } from '../../types';

export const STEPS_TITLES: Record<CreatePackSteps, string> = {
  [CreatePackSteps.SelectItems]: 'Select Items',
  [CreatePackSteps.SelectVoucher]: 'Select Voucher',
  [CreatePackSteps.AdjustQuantities]: 'Adjust Quantities',
  [CreatePackSteps.ReviewAndMint]: 'Review & Mint',
};

export const CONTINUE_TITLES: Record<CreatePackSteps, string> = {
  [CreatePackSteps.SelectItems]: 'Continue to Voucher',
  [CreatePackSteps.SelectVoucher]: 'Continue to Quantities',
  [CreatePackSteps.AdjustQuantities]: 'Continue to Mint',
  [CreatePackSteps.ReviewAndMint]: 'Confirm & Mint',
};
