import { Connection, Keypair, Transaction } from '@solana/web3.js';
import {
  defaultSendOptions,
  TransactionHandler,
  assertConfirmedTransaction,
} from '@metaplex-foundation/amman';
import {
  VerifyCollectionInstructionAccounts,
  createVerifyCollectionInstruction,
} from '@metaplex-foundation/mpl-token-metadata';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore createMintToInstruction export actually exist but isn't setup correctly
import { createMintToInstruction } from '@solana/spl-token';
import { strict as assert } from 'assert';
import { createAndSignTransaction } from '../utils';

type Params = Omit<VerifyCollectionInstructionAccounts, 'payer'> & {
  transactionHandler: TransactionHandler;
  connection: Connection;
  payer: Keypair;
};

export async function verifyCollection({
  transactionHandler,
  connection,
  payer,
  ...params
}: Params) {
  const verifyCollectionInstruction = createVerifyCollectionInstruction({
    payer: payer.publicKey,
    ...params,
  });

  const verifyCollectionTx: Transaction = await createAndSignTransaction(
    connection,
    payer,
    [verifyCollectionInstruction],
    [payer],
  );

  const res = await transactionHandler.sendAndConfirmTransaction(
    verifyCollectionTx,
    [],
    defaultSendOptions,
  );
  assertConfirmedTransaction(assert, res.txConfirmed);
}
