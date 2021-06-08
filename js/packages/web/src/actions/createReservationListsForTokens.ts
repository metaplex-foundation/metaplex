import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { createReservationList } from '@oyster/common';

import { SafetyDepositInstructionConfig } from './addTokensToVault';
import { AuctionManagerSettings, WinningConfigType } from '../models/metaplex';

const BATCH_SIZE = 10;
// This command batches out creating reservation lists for those tokens who are being sold in Printing mode.
// Reservation lists are used to insure printing order among limited editions.
export async function createReservationListForTokens(
  wallet: any,
  auctionManager: PublicKey,
  settings: AuctionManagerSettings,
  safetyDepositInstructionConfigs: SafetyDepositInstructionConfig[],
): Promise<{
  instructions: Array<TransactionInstruction[]>;
  signers: Array<Keypair[]>;
}> {
  let batchCounter = 0;

  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];

  let currSigners: Keypair[] = [];
  let currInstructions: TransactionInstruction[] = [];
  for (let i = 0; i < safetyDepositInstructionConfigs.length; i++) {
    const safetyDeposit = safetyDepositInstructionConfigs[i];
    const relevantConfig = settings.winningConfigs
      .map(i => i.items)
      .flat()
      .find(it => it.safetyDepositBoxIndex === i);
    if (
      relevantConfig?.winningConfigType === WinningConfigType.Printing &&
      safetyDeposit.draft.masterEdition
    )
      await createReservationList(
        safetyDeposit.draft.metadata.pubkey,
        safetyDeposit.draft.masterEdition.pubkey,
        auctionManager,
        wallet.publicKey,
        wallet.publicKey,
        currInstructions,
      );

    if (batchCounter === BATCH_SIZE) {
      signers.push(currSigners);
      instructions.push(currInstructions);
      batchCounter = 0;
      currSigners = [];
      currInstructions = [];
    }
    batchCounter++;
  }

  if (instructions[instructions.length - 1] !== currInstructions) {
    signers.push(currSigners);
    instructions.push(currInstructions);
  }

  return { signers, instructions };
}
