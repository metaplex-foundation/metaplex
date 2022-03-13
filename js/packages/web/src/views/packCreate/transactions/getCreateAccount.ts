import { SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { GetCreateAccountParams } from './interface';

export const getCreateAccount = async ({
  connection,
  newAccountPubkey,
  walletPublicKey,
  space,
  programId,
}: GetCreateAccountParams): Promise<TransactionInstruction> => {
  const packSetRentExempt = await connection.getMinimumBalanceForRentExemption(
    space,
  );

  return SystemProgram.createAccount({
    fromPubkey: walletPublicKey,
    newAccountPubkey,
    lamports: packSetRentExempt,
    space,
    programId,
  });
};
