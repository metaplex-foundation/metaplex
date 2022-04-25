import { initCusper } from '@metaplex-foundation/cusper';
import { errorFromCode } from './generated';

export const cusper = initCusper(errorFromCode);
