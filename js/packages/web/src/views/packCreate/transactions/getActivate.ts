import { activate } from '@oyster/common/dist/lib/models/packs/instructions/activate';
import { TransactionInstruction } from '@solana/web3.js';

import { GetActivateParams } from './interface';

export const getActivate = async ({
  packSetKey,
  walletPublicKey,
}: GetActivateParams): Promise<TransactionInstruction> => {
  return activate({
    packSetKey,
    authority: walletPublicKey.toBase58(),
  });
};
