import { Connection, PublicKey, Transaction } from '@solana/web3.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore createMintToInstruction export actually exist but isn't setup correctly
import { createMintToInstruction } from '@solana/spl-token';
import { defaultSendOptions, TransactionHandler } from '@metaplex-foundation/amman';

import { CreateMint } from './createMintAccount';
import { createTokenAccount } from '../transactions';

interface MintTokenToAccountParams {
  connection: Connection;
  payer: PublicKey;
  transactionHandler: TransactionHandler;
}

export const mintTokenToAccount = async ({
  connection,
  payer,
  transactionHandler,
}: MintTokenToAccountParams) => {
  const tx = new Transaction();

  const { mint, createMintTx } = await CreateMint.createMintAccount(connection, payer);

  tx.add(createMintTx);

  const { tokenAccount: associatedTokenAccount, createTokenTx } = await createTokenAccount({
    payer,
    mint: mint.publicKey,
    connection,
  });

  tx.add(createTokenTx);

  tx.add(createMintToInstruction(mint.publicKey, associatedTokenAccount.publicKey, payer, 1));

  await transactionHandler.sendAndConfirmTransaction(
    tx,
    [mint, associatedTokenAccount],
    defaultSendOptions,
  );

  return { mint, mintAta: associatedTokenAccount };
};
