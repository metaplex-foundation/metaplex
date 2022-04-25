import test from 'tape';
import {
  assertConfirmedTransaction,
  defaultSendOptions,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { createTokenAccount } from '../transactions';
import { createAndSignTransaction, logDebug } from '../utils';

import { findTreasuryOwnerAddress } from '../../src/utils';
import {
  createCreateMarketInstruction,
  CreateMarketInstructionArgs,
} from '../../src/generated/instructions';

type CreateMarketParams = {
  test: test.Test;
  transactionHandler: PayerTransactionHandler;
  payer: Keypair;
  connection: Connection;
  store: PublicKey;
  sellingResource: PublicKey;
  treasuryMint: PublicKey;
  collectionMint?: PublicKey;
  params: Omit<CreateMarketInstructionArgs, 'treasuryOwnerBump'>;
};

export const createMarket = async ({
  test,
  transactionHandler,
  payer,
  connection,
  store,
  sellingResource,
  treasuryMint,
  collectionMint,
  params,
}: CreateMarketParams): Promise<{
  market: Keypair;
  treasuryHolder: Keypair;
  treasuryOwnerBump: number;
  treasuryOwner: PublicKey;
}> => {
  const [treasuryOwner, treasuryOwnerBump] = await findTreasuryOwnerAddress(
    treasuryMint,
    sellingResource,
  );

  logDebug(`treasuryOwner: ${treasuryOwner.toBase58()}`);

  const { tokenAccount: treasuryHolder, createTokenTx } = await createTokenAccount({
    payer: payer.publicKey,
    connection,
    mint: treasuryMint,
    owner: treasuryOwner,
  });

  const createVaultRes = await transactionHandler.sendAndConfirmTransaction(
    createTokenTx,
    [treasuryHolder],
    defaultSendOptions,
  );

  logDebug(`treasuryHolder: ${treasuryHolder.publicKey}`);
  assertConfirmedTransaction(test, createVaultRes.txConfirmed);

  const market = Keypair.generate();

  const instruction = createCreateMarketInstruction(
    {
      market: market.publicKey,
      store,
      sellingResourceOwner: payer.publicKey,
      sellingResource,
      mint: treasuryMint,
      treasuryHolder: treasuryHolder.publicKey,
      owner: treasuryOwner,
      collectionMint,
    },
    {
      treasuryOwnerBump,
      ...params,
    },
  );

  const marketTx: Transaction = await createAndSignTransaction(
    connection,
    payer,
    [instruction],
    [market],
  );

  const marketRes = await transactionHandler.sendAndConfirmTransaction(
    marketTx,
    [market],
    defaultSendOptions,
  );

  logDebug(`market: ${market.publicKey}`);
  assertConfirmedTransaction(test, marketRes.txConfirmed);

  return { market, treasuryHolder, treasuryOwnerBump, treasuryOwner };
};
