import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  deprecatedCreateReservationList,
  StringPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { SafetyDepositInstructionTemplate } from './addTokensToVault';
import { WinningConfigType } from '@oyster/common/dist/lib/models/metaplex/index';

const BATCH_SIZE = 10;
// This command batches out creating reservation lists for those tokens who are being sold in PrintingV1 mode.
// Reservation lists are used to insure printing order among limited editions.
export async function deprecatedCreateReservationListForTokens(
  wallet: WalletSigner,
  auctionManager: StringPublicKey,
  safetyDepositInstructionTemplates: SafetyDepositInstructionTemplate[],
): Promise<{
  instructions: Array<TransactionInstruction[]>;
  signers: Array<Keypair[]>;
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let batchCounter = 0;

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

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
        wallet.publicKey.toBase58(),
        wallet.publicKey.toBase58(),
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
