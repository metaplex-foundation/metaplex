import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  Vault,
  ParsedAccount,
  SafetyDepositBox,
  programIds,
  createAssociatedTokenAccountInstruction,
  withdrawTokenFromSafetyDepositBox,
  VaultState,
  sendTransactionsWithManualRetry,
  decodeExternalPriceAccount,
  findProgramAddress,
} from '@oyster/common';

import BN from 'bn.js';
import { closeVault } from './closeVault';

const BATCH_SIZE = 1;

// Given a vault you own, unwind all the tokens out of it.
export async function unwindVault(
  connection: Connection,
  wallet: any,
  vault: ParsedAccount<Vault>,
  safetyDepositBoxesByVaultAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositBox>
  >,
) {
  let batchCounter = 0;
  const PROGRAM_IDS = programIds();
  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];

  let currSigners: Keypair[] = [];
  let currInstructions: TransactionInstruction[] = [];

  if (vault.info.state == VaultState.Inactive) {
    console.log('Vault is inactive, combining');
    const epa = await connection.getAccountInfo(
      vault.info.pricingLookupAddress,
    );
    if (epa) {
      const decoded = decodeExternalPriceAccount(epa.data);
      // "Closing" it here actually brings it to Combined state which means we can withdraw tokens.
      let { instructions: cvInstructions, signers: cvSigners } =
        await closeVault(
          connection,
          wallet,
          vault.pubkey,
          vault.info.fractionMint,
          vault.info.fractionTreasury,
          vault.info.redeemTreasury,
          decoded.priceMint,
          vault.info.pricingLookupAddress,
          false,
        );

      signers.push(cvSigners);
      instructions.push(cvInstructions);
    }
  }

  const vaultKey = vault.pubkey.toBase58();
  let boxes: ParsedAccount<SafetyDepositBox>[] = [];

  let box = safetyDepositBoxesByVaultAndIndex[vaultKey + '-0'];
  if (box) {
    boxes.push(box);
    let i = 1;
    while (box) {
      box = safetyDepositBoxesByVaultAndIndex[vaultKey + '-' + i.toString()];
      if (box) boxes.push(box);
      i++;
    }
  }
  console.log('Found boxes', boxes);
  for (let i = 0; i < boxes.length; i++) {
    let nft = boxes[i];
    const ata = (
      await findProgramAddress(
        [
          wallet.publicKey.toBuffer(),
          PROGRAM_IDS.token.toBuffer(),
          nft.info.tokenMint.toBuffer(),
        ],
        PROGRAM_IDS.associatedToken,
      )
    )[0];

    const existingAta = await connection.getAccountInfo(ata);
    console.log('Existing ata?', existingAta);
    if (!existingAta)
      createAssociatedTokenAccountInstruction(
        currInstructions,
        ata,
        wallet.publicKey,
        wallet.publicKey,
        nft.info.tokenMint,
      );

    const value = await connection.getTokenAccountBalance(nft.info.store);
    await withdrawTokenFromSafetyDepositBox(
      new BN(value.value.uiAmount || 1),
      ata,
      nft.pubkey,
      nft.info.store,
      vault.pubkey,
      vault.info.fractionMint,
      vault.info.authority,
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

  await sendTransactionsWithManualRetry(
    connection,
    wallet,
    instructions,
    signers,
  );
}
