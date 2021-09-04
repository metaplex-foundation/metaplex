import BN from 'bn.js';
import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  sendTransactions,
  sendTransactionWithRetry,
  SequenceType,
  StringPublicKey,
  TokenAccount,
} from '@oyster/common';
import { setupMintEditionIntoWalletInstructions } from './setupMintEditionIntoWalletInstructions';
import { Art } from '../types';
import { WalletAdapter } from '@solana/wallet-adapter-base';

// TODO: Refactor. Extract batching logic,
//  as the similar one is used in settle.ts and convertMasterEditions.ts
const MINT_TRANSACTION_SIZE = 5;
const BATCH_SIZE = 10;

export async function mintEditionsToWallet(
  art: Art,
  wallet: WalletAdapter,
  connection: Connection,
  mintTokenAccount: TokenAccount,
  editions: number = 1,
  mintDestination: StringPublicKey,
) {
  let signers: Array<Array<Keypair[]>> = [];
  let instructions: Array<Array<TransactionInstruction[]>> = [];

  let currSignerBatch: Array<Keypair[]> = [];
  let currInstrBatch: Array<TransactionInstruction[]> = [];

  let mintEditionIntoWalletSigners: Keypair[] = [];
  let mintEditionIntoWalletInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  // Overall we have 10 parallel txns.
  // That's what this loop is building.
  for (let i = 0; i < editions; i++) {
    console.log('Minting', i);
    await setupMintEditionIntoWalletInstructions(
      art,
      wallet,
      connection,
      mintTokenAccount,
      new BN(art.supply! + 1 + i),
      mintEditionIntoWalletInstructions,
      mintEditionIntoWalletSigners,
      mintDestination,
    );

    if (mintEditionIntoWalletInstructions.length === MINT_TRANSACTION_SIZE) {
      currSignerBatch.push(mintEditionIntoWalletSigners);
      currInstrBatch.push(mintEditionIntoWalletInstructions);
      mintEditionIntoWalletSigners = [];
      mintEditionIntoWalletInstructions = [];
    }

    if (currInstrBatch.length === BATCH_SIZE) {
      signers.push(currSignerBatch);
      instructions.push(currInstrBatch);
      currSignerBatch = [];
      currInstrBatch = [];
    }
  }

  if (
    mintEditionIntoWalletInstructions.length < MINT_TRANSACTION_SIZE &&
    mintEditionIntoWalletInstructions.length > 0
  ) {
    currSignerBatch.push(mintEditionIntoWalletSigners);
    currInstrBatch.push(mintEditionIntoWalletInstructions);
  }

  if (currInstrBatch.length <= BATCH_SIZE && currInstrBatch.length > 0) {
    // add the last one on
    signers.push(currSignerBatch);
    instructions.push(currInstrBatch);
  }
  console.log('Instructions', instructions);
  for (let i = 0; i < instructions.length; i++) {
    const instructionBatch = instructions[i];
    const signerBatch = signers[i];
    console.log('Running batch', i);
    if (instructionBatch.length >= 2)
      // Pump em through!
      await sendTransactions(
        connection,
        wallet,
        instructionBatch,
        signerBatch,
        SequenceType.StopOnFailure,
        'single',
      );
    else
      await sendTransactionWithRetry(
        connection,
        wallet,
        instructionBatch[0],
        signerBatch[0],
        'single',
      );
    console.log('Done');
  }
}
