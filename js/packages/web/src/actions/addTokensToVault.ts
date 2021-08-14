import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  utils,
  actions,
  models,
  findProgramAddress,
  MetadataKey,
} from '@oyster/common';

import { AccountLayout } from '@solana/spl-token';
import BN from 'bn.js';
import { SafetyDepositDraft } from './createAuctionManager';
const { createTokenAccount, addTokenToInactiveVault, VAULT_PREFIX } = actions;
const { approve } = models;

export interface SafetyDepositInstructionConfig {
  tokenAccount?: PublicKey;
  tokenMint: PublicKey;
  amount: BN;
  draft: SafetyDepositDraft;
}

const BATCH_SIZE = 1;
// This command batches out adding tokens to a vault using a prefilled payer account, and then activates and combines
// the vault for use. It issues a series of transaction instructions and signers for the sendTransactions batch.
export async function addTokensToVault(
  connection: Connection,
  wallet: any,
  vault: PublicKey,
  nfts: SafetyDepositInstructionConfig[],
): Promise<{
  instructions: Array<TransactionInstruction[]>;
  signers: Array<Keypair[]>;
  safetyDepositTokenStores: PublicKey[];
}> {
  const PROGRAM_IDS = utils.programIds();

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const vaultAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        PROGRAM_IDS.vault.toBuffer(),
        vault.toBuffer(),
      ],
      PROGRAM_IDS.vault,
    )
  )[0];

  let batchCounter = 0;

  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];
  let newStores: PublicKey[] = [];

  let currSigners: Keypair[] = [];
  let currInstructions: TransactionInstruction[] = [];
  for (let i = 0; i < nfts.length; i++) {
    let nft = nfts[i];
    if (nft.tokenAccount) {
      const newStoreAccount = createTokenAccount(
        currInstructions,
        wallet.publicKey,
        accountRentExempt,
        nft.tokenMint,
        vaultAuthority,
        currSigners,
      );
      newStores.push(newStoreAccount);

      const transferAuthority = approve(
        currInstructions,
        [],
        nft.tokenAccount,
        wallet.publicKey,
        nft.amount.toNumber(),
      );

      currSigners.push(transferAuthority);

      await addTokenToInactiveVault(
        nft.draft.masterEdition &&
          nft.draft.masterEdition.info.key === MetadataKey.MasterEditionV2
          ? new BN(1)
          : nft.amount,
        nft.tokenMint,
        nft.tokenAccount,
        newStoreAccount,
        vault,
        wallet.publicKey,
        wallet.publicKey,
        transferAuthority.publicKey,
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
  }

  if (instructions[instructions.length - 1] !== currInstructions) {
    signers.push(currSigners);
    instructions.push(currInstructions);
  }

  return { signers, instructions, safetyDepositTokenStores: newStores };
}
