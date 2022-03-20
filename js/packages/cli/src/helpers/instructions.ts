import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  CONFIG_ARRAY_START_V2,
  CANDY_MACHINE_PROGRAM_V2_ID,
  CONFIG_LINE_SIZE_V2,
} from './constants';
import * as anchor from '@project-serum/anchor';
import { CandyMachineData } from './accounts';
import { Program } from '@project-serum/anchor';

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

export function createUpdateMetadataInstruction(
  metadataAccount: PublicKey,
  payer: PublicKey,
  txnData: Buffer,
) {
  const keys = [
    {
      pubkey: metadataAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: txnData,
  });
}

export async function createCandyMachineV2Account(
  anchorProgram,
  candyData: CandyMachineData,
  payerWallet,
  candyAccount,
) {
  const size =
    CONFIG_ARRAY_START_V2 +
    4 +
    candyData.itemsAvailable.toNumber() * CONFIG_LINE_SIZE_V2 +
    8 +
    2 * (Math.floor(candyData.itemsAvailable.toNumber() / 8) + 1);

  return anchor.web3.SystemProgram.createAccount({
    fromPubkey: payerWallet,
    newAccountPubkey: candyAccount,
    space: size,
    lamports:
      await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
        size,
      ),
    programId: CANDY_MACHINE_PROGRAM_V2_ID,
  });
}

export async function updateCandyMachineUUID(
  uuid: string,
  anchorProgram: Program,
  candyAccount: PublicKey,
) {
  const candyMachineObj = await anchorProgram.account.candyMachine.fetch(
    candyAccount,
  );

  const newSettings = {
    itemsAvailable: candyMachineObj.data.itemsAvailable,
    uuid: uuid,
    symbol: candyMachineObj.data.symbol,
    sellerFeeBasisPoints: candyMachineObj.data.sellerFeeBasisPoints,
    isMutable: candyMachineObj.data.isMutable,
    maxSupply: candyMachineObj.data.maxSupply,
    retainAuthority: candyMachineObj.data.retainAuthority,
    gatekeeper: candyMachineObj.data.gatekeeper,
    goLiveDate: candyMachineObj.data.goLiveDate,
    endSettings: candyMachineObj.data.endSettings,
    price: candyMachineObj.data.price,
    whitelistMintSettings: candyMachineObj.data.whitelistMintSettings,
    hiddenSettings: candyMachineObj.data.hiddenSettings,
    creators: candyMachineObj.data.creators.map(creator => {
      return {
        address: new PublicKey(creator.address),
        verified: true,
        share: creator.share,
      };
    }),
  };

  const remainingAccounts = [];
  if (candyMachineObj.tokenMint) {
    remainingAccounts.push({
      pubkey: candyMachineObj.tokenMint,
      isSigner: false,
      isWritable: false,
    });
  }

  return await anchorProgram.instruction.updateCandyMachine(newSettings, {
    accounts: {
      candyMachine: candyAccount,
      authority: candyMachineObj.authority,
      wallet: candyMachineObj.wallet,
    },
    remainingAccounts:
      remainingAccounts.length > 0 ? remainingAccounts : undefined,
  });
}
