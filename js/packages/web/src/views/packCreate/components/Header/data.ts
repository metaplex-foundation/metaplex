import { CreatePackSteps } from '../../types';
import { HeaderContentRecord } from './interface';

export const HEADER_CONTENT: Record<CreatePackSteps, HeaderContentRecord> = {
  [CreatePackSteps.SelectItems]: {
    title: 'Select items for your Pack Listing',
  },
  [CreatePackSteps.SelectVoucher]: {
    title: 'Select voucher for your Pack Opening',
  },
  [CreatePackSteps.AdjustQuantities]: {
    title: 'Adjust Quantities',
  },
  [CreatePackSteps.ReviewAndMint]: {
    title: 'Review and mint your pack',
  },
};
