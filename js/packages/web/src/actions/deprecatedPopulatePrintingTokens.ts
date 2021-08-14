import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  utils,
  createAssociatedTokenAccountInstruction,
  deprecatedMintPrintingTokens,
  findProgramAddress,
  MasterEditionV1,
  ParsedAccount,
  MetadataKey,
} from '@oyster/common';

import BN from 'bn.js';
import { SafetyDepositInstructionConfig } from './addTokensToVault';

const BATCH_SIZE = 4;
// Printing tokens are minted on the fly as needed. We need to pre-mint them to give to the vault
// for all relevant NFTs.
export async function deprecatedPopulatePrintingTokens(
  connection: Connection,
  wallet: any,
  safetyDepositConfigs: SafetyDepositInstructionConfig[],
): Promise<{
  instructions: Array<TransactionInstruction[]>;
  signers: Array<Keypair[]>;
  safetyDepositConfigs: SafetyDepositInstructionConfig[];
}> {
  const PROGRAM_IDS = utils.programIds();

  let batchCounter = 0;

  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];

  let currSigners: Keypair[] = [];
  let currInstructions: TransactionInstruction[] = [];
  for (let i = 0; i < safetyDepositConfigs.length; i++) {
    let nft = safetyDepositConfigs[i];
    if (nft.draft.masterEdition?.info.key != MetadataKey.MasterEditionV1) {
      continue;
    }
    const printingMint = (
      nft.draft.masterEdition as ParsedAccount<MasterEditionV1>
    )?.info.printingMint;
    if (nft.tokenMint.equals(printingMint) && !nft.tokenAccount) {
      const holdingKey: PublicKey = (
        await findProgramAddress(
          [
            wallet.publicKey.toBuffer(),
            PROGRAM_IDS.token.toBuffer(),
            printingMint.toBuffer(),
          ],
          PROGRAM_IDS.associatedToken,
        )
      )[0];

      createAssociatedTokenAccountInstruction(
        currInstructions,
        holdingKey,
        wallet.publicKey,
        wallet.publicKey,
        printingMint,
      );
      console.log('Making atas');

      nft.draft.printingMintHolding = holdingKey;
      nft.tokenAccount = holdingKey;
    }
    if (nft.tokenAccount && nft.tokenMint.equals(printingMint)) {
      let balance = 0;
      try {
        balance =
          (await connection.getTokenAccountBalance(nft.tokenAccount)).value
            .uiAmount || 0;
      } catch (e) {
        console.error(e);
      }

      if (balance < nft.amount.toNumber() && nft.draft.masterEdition)
        await deprecatedMintPrintingTokens(
          nft.tokenAccount,
          nft.tokenMint,
          wallet.publicKey,
          nft.draft.metadata.pubkey,
          nft.draft.masterEdition.pubkey,
          new BN(nft.amount.toNumber() - balance),
          currInstructions,
        );

      batchCounter++;
    }

    if (batchCounter === BATCH_SIZE) {
      signers.push(currSigners);
      instructions.push(currInstructions);
      batchCounter = 0;
      currSigners = [];
      currInstructions = [];
    }
  }

  if (instructions[instructions.length - 1] !== currInstructions) {
    signers.push(currSigners);
    instructions.push(currInstructions);
  }

  return { signers, instructions, safetyDepositConfigs };
}
