import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { MintLayout } from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { StringPublicKey } from '@oyster/common';

import { createMintAndAccountWithOne } from '../../../actions/createMintAndAccountWithOne';

interface Response {
  mint: StringPublicKey;
  account: StringPublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}

export async function getNewMint(
  wallet: WalletContextState,
  connection: Connection,
): Promise<Response> {
  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  if (!wallet.publicKey) {
    throw new Error('Wallet pubKey is not provided');
  }

  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  const newMint = await createMintAndAccountWithOne(
    wallet,
    wallet.publicKey.toString(),
    mintRentExempt,
    instructions,
    signers,
  );

  return { ...newMint, instructions, signers };
}
