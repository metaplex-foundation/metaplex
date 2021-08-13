import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { deprecatedCreateReservationList } from '@oyster/common';

import { SafetyDepositInstructionTemplate } from './addTokensToVault';
import { WinningConfigType } from '../models/metaplex';

const BATCH_SIZE = 10;
// This command batches out creating reservation lists for those tokens who are being sold in PrintingV1 mode.
// Reservation lists are used to insure printing order among limited editions.
export async function deprecatedCreateReservationListForTokens(
  wallet: any,
  auctionManager: PublicKey,
  safetyDepositInstructionTemplates: SafetyDepositInstructionTemplate[],
): Promise<{
  instructions: Array<TransactionInstruction[]>;
  signers: Array<Keypair[]>;
}> {
  let batchCounter = 0;

  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];

  let currSigners: Keypair[] = [];
  let currInstructions: TransactionInstruction[] = [];
  for (let i = 0; i < safetyDepositInstructionTemplates.length; i++) {
    const safetyDeposit = safetyDepositInstructionTemplates[i];

    if (
      safetyDeposit.config.winningConfigType === WinningConfigType.PrintingV1 &&
      safetyDeposit.draft.masterEdition
    )
      await deprecatedCreateReservationList(
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
