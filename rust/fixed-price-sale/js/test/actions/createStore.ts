import test from 'tape';
import {
  assertConfirmedTransaction,
  defaultSendOptions,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman';
import { Connection, Keypair } from '@solana/web3.js';

import {
  createCreateStoreInstruction,
  CreateStoreInstructionArgs,
} from '../../src/generated/instructions';

import { createAndSignTransaction, logDebug } from '../utils';

type CreateStoreParams = {
  test: test.Test;
  transactionHandler: PayerTransactionHandler;
  payer: Keypair;
  connection: Connection;
  params: CreateStoreInstructionArgs;
};

export const createStore = async ({
  test,
  transactionHandler,
  payer,
  connection,
  params,
}: CreateStoreParams): Promise<Keypair> => {
  const store = Keypair.generate();

  const instruction = createCreateStoreInstruction(
    {
      store: store.publicKey,
      admin: payer.publicKey,
    },
    params,
  );

  const transaction = await createAndSignTransaction(connection, payer, [instruction], [store]);

  const createStoreRes = await transactionHandler.sendAndConfirmTransaction(
    transaction,
    [store],
    defaultSendOptions,
  );
  logDebug(`store: ${store.publicKey}`);

  assertConfirmedTransaction(test, createStoreRes.txConfirmed);

  return store;
};
