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
  name: string;
  packCards: number;
  packVouchers: number;
  totalWeight?: BN;
  totalEditions?: BN;
  mutable: boolean;
  packState: PackSetState;
  distributionType: PackDistributionType;
  allowedAmountToRedeem: number;
  redeemStartDate: BN;
  redeemEndDate?: BN;
  randomOracle: StringPublicKey;

  constructor(args: {
    key: PackKey;
    store: StringPublicKey;
    authority: StringPublicKey;
    description: string;
    uri: string;
    name: Uint8Array;
    packCards: number;
    packVouchers: number;
    totalWeight?: BN;
    totalEditions?: BN;
    mutable: number;
    packState: PackSetState;
    distributionType: PackDistributionType;
    allowedAmountToRedeem: number;
    redeemStartDate: BN;
    redeemEndDate?: BN;
    randomOracle: StringPublicKey;
  }) {
    this.key = PackKey.PackSet;
    this.store = args.store;
    this.authority = args.authority;
    this.description = args.description.replace(/\0/g, '');
    this.uri = args.uri.replace(/\0/g, '');
    this.name = new TextDecoder().decode(args.name).replace(/\0/g, '');
    this.packCards = args.packCards;
    this.packVouchers = args.packVouchers;
    this.totalWeight = args.totalWeight;
    this.totalEditions = args.totalEditions;
    this.mutable = !!args.mutable;
    this.packState = args.packState;
    this.allowedAmountToRedeem = args.allowedAmountToRedeem;
    this.distributionType = args.distributionType;
    this.redeemStartDate = args.redeemStartDate;
    this.redeemEndDate = args.redeemEndDate;
    this.randomOracle = args.randomOracle;
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
        ['totalWeight', 'u64'],
        ['totalEditions', 'u64'],
        ['mutable', 'u8'],
        ['packState', 'u8'],
        ['distributionType', 'u8'],
        ['allowedAmountToRedeem', 'u32'],
        ['redeemStartDate', 'u64'],
        ['redeemEndDate', { kind: 'option', type: 'u64' }],
        ['randomOracle', 'pubkeyAsString'],
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

export const getPackSetByPubkey = async (
  connection: Connection,
  pubkey: StringPublicKey,
): Promise<AccountAndPubkey> => {
  const info = await connection.getAccountInfo(new PublicKey(pubkey));
  if (!info) {
    throw new Error(`Unable to find account: ${pubkey}`);
  }

  return {
    pubkey,
    account: info,
  };
};
