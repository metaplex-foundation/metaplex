import {
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { TokenAccount } from '../..';
import { getEdition, getMetadata } from '../../..';
import { StringPublicKey, programIds, toPublicKey } from '../../../utils';
import {
  findPackCardProgramAddress,
  getProgramAuthority,
  AddCardToPackArgs,
  PACKS_SCHEMA,
} from '../../../actions/packs';
import { AddCardToPackParams } from '../interface';

interface Params extends AddCardToPackParams {
  packSetKey: PublicKey;
  authority: string;
  mint: StringPublicKey;
  tokenAccount: TokenAccount;
  toAccount: Keypair;
}

export async function addCardToPack({
  maxSupply,
  weight,
  index,
  packSetKey,
  authority,
  mint,
  tokenAccount,
  toAccount,
}: Params): Promise<TransactionInstruction[]> {
  const PROGRAM_IDS = programIds();

  const value = new AddCardToPackArgs({
    maxSupply,
    weight,
    index,
  });

  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const masterMetadataKey = await getMetadata(mint);
  const masterEdition = await getEdition(mint);
  const programAuthority = await getProgramAuthority();
  const packCard = await findPackCardProgramAddress(packSetKey, index);
  const { pubkey: sourceKey } = tokenAccount;

  const data = Buffer.from(serialize(PACKS_SCHEMA, value));
  const keys = [
    // pack_set
    {
      pubkey: toPublicKey(packSetKey),
      isSigner: false,
      isWritable: true,
    },
    // pack_card
    {
      pubkey: toPublicKey(packCard),
      isSigner: false,
      isWritable: true,
    },
    // signer authority
    {
      pubkey: toPublicKey(authority),
      isSigner: true,
      isWritable: false,
    },
    // master_edition
    {
      pubkey: toPublicKey(masterEdition),
      isSigner: false,
      isWritable: false,
    },
    // master_metadata
    {
      pubkey: toPublicKey(masterMetadataKey),
      isSigner: false,
      isWritable: false,
    },
    // mint
    {
      pubkey: toPublicKey(mint),
      isSigner: false,
      isWritable: false,
    },
    // source
    {
      pubkey: toPublicKey(sourceKey),
      isSigner: false,
      isWritable: true,
    },
    // token_account
    {
      pubkey: toPublicKey(toAccount.publicKey),
      isSigner: false,
      isWritable: true,
    },
    // program_authority
    {
      pubkey: toPublicKey(programAuthority),
      isSigner: false,
      isWritable: false,
    },
    // store
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    // rent
    {
      pubkey: toPublicKey(SYSVAR_RENT_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    // system_program
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    // spl_token program
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];

  return [
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.pack_create),
      data,
    }),
  ];
}
