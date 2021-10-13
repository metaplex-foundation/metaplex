import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { serialize } from 'borsh';
const web3_js_1 = require('@solana/web3.js');

import { InitPackSetArgs, PackDistributionType, SCHEMA } from '.';
import { programIds, StringPublicKey, toPublicKey } from '../../utils';

export async function initPackSet(
  instructions: TransactionInstruction[],
  name: Uint32Array,
  uri: StringPublicKey,
  mutable: boolean,
  distribution_type: PackDistributionType,
  allowed_amount_to_redeem: BN,
  redeem_start_date: BN | null,
  redeem_end_date: BN | null,
  packSetKey: PublicKey,
  authority: string,
) {
  const PROGRAM_IDS = programIds();

  const value = new InitPackSetArgs({
    name,
    uri,
    mutable,
    distribution_type,
    allowed_amount_to_redeem,
    redeem_start_date,
    redeem_end_date,
  });

  const data = Buffer.from(serialize(SCHEMA, value));
  const keys = [
    {
      pubkey: toPublicKey(packSetKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(authority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(authority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(web3_js_1.SYSVAR_RENT_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(web3_js_1.SYSVAR_CLOCK_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.pack_create),
      data,
    }),
  );
}
