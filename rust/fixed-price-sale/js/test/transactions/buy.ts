import {
  Connection,
  PublicKey,
  Transaction,
  SYSVAR_CLOCK_PUBKEY,
  AccountMeta,
} from '@solana/web3.js';
import { PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';

import { createBuyInstruction } from '../../src/generated/instructions';

interface BuyParams {
  connection: Connection;
  buyer: PublicKey;
  userTokenAccount: PublicKey;
  resourceMintMetadata: PublicKey;
  resourceMintEditionMarker: PublicKey;
  resourceMintMasterEdition: PublicKey;
  sellingResource: PublicKey;
  tradeHistory: PublicKey;
  tradeHistoryBump: number;
  market: PublicKey;
  marketTreasuryHolder: PublicKey;
  vaultOwner: PublicKey;
  vault: PublicKey;
  vaultOwnerBump: number;
  newMint: PublicKey;
  newMintEdition: PublicKey;
  newMintMetadata: PublicKey;
  newTokenAccount: PublicKey;
  additionalKeys?: AccountMeta[];
}

export const createBuyTransaction = async ({
  connection,
  buyer,
  userTokenAccount,
  resourceMintMetadata,
  resourceMintEditionMarker,
  resourceMintMasterEdition,
  sellingResource,
  tradeHistory,
  tradeHistoryBump,
  market,
  marketTreasuryHolder,
  vault,
  vaultOwner,
  vaultOwnerBump,
  newMint,
  newMintEdition,
  newMintMetadata,
  newTokenAccount,
  additionalKeys,
}: BuyParams) => {
  const instruction = createBuyInstruction(
    {
      // buyer wallet
      userWallet: buyer,
      // user token account
      userTokenAccount,
      // resource mint edition marker PDA
      editionMarker: resourceMintEditionMarker,
      // resource mint master edition
      masterEdition: resourceMintMasterEdition,
      // resource mint metadata PDA
      masterEditionMetadata: resourceMintMetadata,
      // token account for selling resource
      vault,
      // account which holds selling entities
      sellingResource,
      // owner of selling resource token account PDA
      owner: vaultOwner,
      // market account
      market,
      // PDA which creates on market for each buyer
      tradeHistory,
      // market treasury holder (buyer will send tokens to this account)
      treasuryHolder: marketTreasuryHolder,
      // newly generated mint address
      newMint,
      // newly generated mint metadata PDA
      newMetadata: newMintMetadata,
      // newly generated mint edition PDA
      newEdition: newMintEdition,
      newTokenAccount,
      // metaplex token metadata program address
      tokenMetadataProgram: PROGRAM_ID,
      clock: SYSVAR_CLOCK_PUBKEY,
      additionalKeys,
    },
    { tradeHistoryBump, vaultOwnerBump },
  );

  const tx = new Transaction();
  tx.add(instruction);
  tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  tx.feePayer = buyer;

  return { tx };
};
