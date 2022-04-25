import { Connection, Keypair, Transaction, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { PayerTransactionHandler } from '@metaplex-foundation/amman';
import { createAndSignTransaction } from '../utils';
import { createCloseMarketInstruction } from '../../src/generated/instructions';

type CloseMarketParams = {
  transactionHandler: PayerTransactionHandler;
  payer: Keypair;
  connection: Connection;
  market: Keypair;
};

export const closeMarket = async ({
  payer,
  connection,
  market,
}: CloseMarketParams): Promise<Transaction> => {
  const instruction = await createCloseMarketInstruction({
    market: market.publicKey,
    owner: payer.publicKey,
    clock: SYSVAR_CLOCK_PUBKEY,
  });

  const marketTx: Transaction = await createAndSignTransaction(
    connection,
    payer,
    [instruction],
    [payer],
  );

  return marketTx;
};
