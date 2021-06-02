import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  utils,
  createAssociatedTokenAccountInstruction,
  mintPrintingTokens,
} from '@oyster/common';

import BN from 'bn.js';
import { SafetyDepositInstructionConfig } from './addTokensToVault';

const BATCH_SIZE = 4;
// Printing tokens are minted on the fly as needed. We need to pre-mint them to give to the vault
// for all relevant NFTs.
export async function populatePrintingTokens(
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
    console.log('NFT', nft);
    if (
      nft.tokenMint.toBase58() ==
        nft.draft.masterEdition?.info.printingMint.toBase58() &&
      !nft.tokenAccount
    ) {
      const holdingKey: PublicKey = (
        await PublicKey.findProgramAddress(
          [
            wallet.publicKey.toBuffer(),
            PROGRAM_IDS.token.toBuffer(),
            nft.draft.masterEdition.info.printingMint.toBuffer(),
          ],
          PROGRAM_IDS.associatedToken,
        )
      )[0];

      createAssociatedTokenAccountInstruction(
        currInstructions,
        holdingKey,
        wallet.publicKey,
        wallet.publicKey,
        nft.draft.masterEdition.info.printingMint,
      );
      console.log('Making atas');

      nft.draft.printingMintHolding = holdingKey;
      nft.tokenAccount = holdingKey;
    }
    if (
      nft.tokenAccount &&
      nft.tokenMint.toBase58() ==
        nft.draft.masterEdition?.info.printingMint.toBase58()
    ) {
      let balance = 0;
      try {
        balance =
          (await connection.getTokenAccountBalance(nft.tokenAccount)).value
            .uiAmount || 0;
      } catch (e) {
        console.error(e);
      }
      console.log('bal', balance);
      if (balance < nft.amount.toNumber() && nft.draft.masterEdition)
        await mintPrintingTokens(
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

  if (instructions[instructions.length - 1] != currInstructions) {
    signers.push(currSigners);
    instructions.push(currInstructions);
  }

  return { signers, instructions, safetyDepositConfigs };
}
