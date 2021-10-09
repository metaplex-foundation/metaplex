import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  CANDY_MACHINE_PROGRAM_ID,
  CONFIG_ARRAY_START,
  CONFIG_LINE_SIZE,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from './constants';
import * as anchor from '@project-serum/anchor';

export function createAssociatedTokenAccountInstruction(
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey,
) {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
}


export function createMetadataInstruction(
  metadataAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  txnData: Buffer,
) {
  const keys = [
    {
      pubkey: metadataAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: mint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: mintAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: updateAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: txnData,
  });
}

export function createMasterEditionInstruction(
  metadataAccount: PublicKey,
  editionAccount: PublicKey,
  mint: PublicKey,
  mintAuthority: PublicKey,
  payer: PublicKey,
  updateAuthority: PublicKey,
  txnData: Buffer,
) {

  const keys = [
    {
      pubkey: editionAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: mint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: updateAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: mintAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: metadataAccount,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: txnData,
  });
}

export async function createConfigAccount(
  anchorProgram,
  configData,
  payerWallet,
  configAccount,
) {
  const size =
    CONFIG_ARRAY_START +
    4 +
    configData.maxNumberOfLines.toNumber() * CONFIG_LINE_SIZE +
    4 +
    Math.ceil(configData.maxNumberOfLines.toNumber() / 8);

  return anchor.web3.SystemProgram.createAccount({
    fromPubkey: payerWallet,
    newAccountPubkey: configAccount,
    space: size,
    lamports:
      await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
        size,
      ),
    programId: CANDY_MACHINE_PROGRAM_ID,
  });
}
