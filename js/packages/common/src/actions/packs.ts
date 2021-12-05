import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import { programIds } from '../utils/programIds';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../utils';
import { PackDistributionType } from '../models/packs/types';
import {
  AddCardToPackParams,
  InitPackSetParams,
} from '../models/packs/interface';

export const PACKS_PREFIX = 'packs';
export const CARD_PREFIX = 'card';
export const VOUCHER_PREFIX = 'voucher';

export async function getProgramAuthority(): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(PACKS_PREFIX),
        toPublicKey(PROGRAM_IDS.pack_create).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.pack_create),
    )
  )[0];
}

export async function findPackCardProgramAddress(
  pack: PublicKey,
  index: number,
): Promise<StringPublicKey> {
  return findProgramAddressByPrefix(pack, index, CARD_PREFIX);
}

export async function findPackVoucherProgramAddress(
  pack: PublicKey,
  index: number,
): Promise<StringPublicKey> {
  return findProgramAddressByPrefix(pack, index, VOUCHER_PREFIX);
}

async function findProgramAddressByPrefix(
  packSetKey: PublicKey,
  index: number,
  prefix: string,
): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();

  const numberBuffer = Buffer.allocUnsafe(4);
  numberBuffer.writeUInt16LE(index);

  return (
    await findProgramAddress(
      [Buffer.from(prefix), new PublicKey(packSetKey).toBuffer(), numberBuffer],
      toPublicKey(PROGRAM_IDS.pack_create),
    )
  )[0];
}

export class InitPackSetArgs {
  instruction = 0;
  name: Uint8Array;
  description: string;
  uri: string;
  mutable: boolean;
  distributionType: PackDistributionType;
  allowedAmountToRedeem: BN;
  redeemStartDate: BN | null;
  redeemEndDate: BN | null;

  constructor(args: InitPackSetParams) {
    this.name = args.name;
    this.description = args.description;
    this.uri = args.uri;
    this.mutable = args.mutable;
    this.distributionType = args.distributionType;
    this.allowedAmountToRedeem = args.allowedAmountToRedeem;
    this.redeemStartDate = args.redeemStartDate;
    this.redeemEndDate = args.redeemEndDate;
  }
}

export class AddCardToPackArgs {
  instruction = 1;
  maxSupply: BN | null;
  weight: BN | null;
  index: number;

  constructor(args: AddCardToPackParams) {
    this.maxSupply = args.maxSupply;
    this.weight = args.weight;
    this.index = args.index;
  }
}

export class AddVoucherToPackArgs {
  instruction = 2;

  constructor() {}
}

export class ActivatePackArgs {
  instruction = 3;

  constructor() {}
}

export const PACKS_SCHEMA = new Map<any, any>([
  [
    InitPackSetArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['name', [32]],
        ['description', 'string'],
        ['uri', 'string'],
        ['mutable', 'u8'],
        ['distributionType', 'u8'],
        ['allowedAmountToRedeem', 'u32'],
        ['redeemStartDate', { kind: 'option', type: 'u64' }],
        ['redeemEndDate', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
  [
    AddCardToPackArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['maxSupply', 'u32'],
        ['weight', 'u16'],
        ['index', 'u32'],
      ],
    },
  ],
  [
    AddVoucherToPackArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    ActivatePackArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
]);
