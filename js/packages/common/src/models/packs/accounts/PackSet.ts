import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { deserializeUnchecked } from 'borsh';

import {
  PackKey,
  PackDistributionType,
  PackSetState,
  MAX_PACK_SET_SIZE,
} from '..';
import { AccountAndPubkey, PACK_CREATE_ID, StringPublicKey } from '../../..';
import { getProgramAccounts } from '../../../contexts/meta/web3';

export class PackSet {
  key: PackKey = PackKey.PackSet;
  store: StringPublicKey;
  authority: StringPublicKey;
  description: string;
  uri: string;
  name: Uint8Array;
  packCards: number;
  packVouchers: number;
  totalEditions?: BN;
  mutable: boolean;
  packState: PackSetState;
  distributionType: PackDistributionType;
  redeemStartDate: BN;
  redeemEndDate?: BN;

  constructor(args: {
    key: PackKey;
    store: StringPublicKey;
    authority: StringPublicKey;
    description: string;
    uri: string;
    name: Uint8Array;
    packCards: number;
    packVouchers: number;
    totalEditions?: BN;
    mutable: boolean;
    packState: PackSetState;
    distributionType: PackDistributionType;
    redeemStartDate: BN;
    redeemEndDate?: BN;
  }) {
    this.key = PackKey.PackSet;
    this.store = args.store;
    this.authority = args.authority;
    this.description = args.description;
    this.uri = args.uri;
    this.name = args.name;
    this.packCards = args.packCards;
    this.packVouchers = args.packVouchers;
    this.totalEditions = args.totalEditions;
    this.mutable = args.mutable;
    this.packState = args.packState;
    this.distributionType = args.distributionType;
    this.redeemStartDate = args.redeemStartDate;
    this.redeemEndDate = args.redeemEndDate;
  }
}

export const PACK_SET_SCHEMA = new Map<any, any>([
  [
    PackSet,
    {
      kind: 'struct',
      fields: [
        ['accountType', 'u8'],
        ['store', 'pubkeyAsString'],
        ['authority', 'pubkeyAsString'],
        ['description', 'string'],
        ['uri', 'string'],
        ['name', [32]],
        ['packCards', 'u32'],
        ['packVouchers', 'u32'],
        ['totalEditions', { kind: 'option', type: 'u64' }],
        ['mutable', 'u8'],
        ['packState', 'u8'],
        ['distributionType', 'u8'],
        ['allowedAmountToRedeem', 'u8'],
        ['redeemStartDate', 'u64'],
        ['redeemEndDate', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
]);

export const decodePackSet = (buffer: Buffer) => {
  return deserializeUnchecked(PACK_SET_SCHEMA, PackSet, buffer) as PackSet;
};

export const getPackSets = ({
  connection,
  storeId,
}: {
  connection: Connection;
  storeId?: PublicKey;
}): Promise<AccountAndPubkey[]> => {
  if (!storeId) {
    return Promise.resolve([]);
  }

  return getProgramAccounts(connection, PACK_CREATE_ID.toString(), {
    filters: [
      {
        dataSize: MAX_PACK_SET_SIZE,
      },
      {
        memcmp: {
          offset: 1,
          bytes: storeId.toBase58(),
        },
      },
    ],
  });
};
