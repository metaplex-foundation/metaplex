import { Connection } from '@solana/web3.js';
import { deserializeUnchecked } from 'borsh';

import { PackKey, MAX_PACK_CARD_SIZE } from '..';
import { AccountAndPubkey, PACK_CREATE_ID, StringPublicKey } from '../../..';
import { getProgramAccounts } from '../../../contexts/meta/web3';

export class PackCard {
  key: PackKey = PackKey.PackCard;
  packSet: StringPublicKey;
  master: StringPublicKey;
  metadata: StringPublicKey;
  tokenAccount: StringPublicKey;
  maxSupply: number;
  weight: number;

  constructor(args: {
    key: PackKey;
    packSet: StringPublicKey;
    master: StringPublicKey;
    metadata: StringPublicKey;
    tokenAccount: StringPublicKey;
    maxSupply: number;
    weight: number;
  }) {
    this.key = PackKey.PackSet;
    this.packSet = args.packSet;
    this.master = args.master;
    this.metadata = args.metadata;
    this.tokenAccount = args.tokenAccount;
    this.maxSupply = args.maxSupply;
    this.weight = args.weight;
  }
}

export const PACK_CARD_SCHEMA = new Map<any, any>([
  [
    PackCard,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['packSet', 'pubkeyAsString'],
        ['master', 'pubkeyAsString'],
        ['metadata', 'pubkeyAsString'],
        ['tokenAccount', 'pubkeyAsString'],
        ['maxSupply', 'u32'],
        ['weight', 'u16'],
      ],
    },
  ],
]);

export const decodePackCard = (buffer: Buffer) => {
  return deserializeUnchecked(PACK_CARD_SCHEMA, PackCard, buffer) as PackCard;
};

export const getCardsByPackSet = ({
  connection,
  packSetKey,
}: {
  connection: Connection;
  packSetKey: StringPublicKey;
}): Promise<AccountAndPubkey[]> =>
  getProgramAccounts(connection, PACK_CREATE_ID.toString(), {
    filters: [
      {
        dataSize: MAX_PACK_CARD_SIZE,
      },
      {
        memcmp: {
          offset: 1,
          bytes: packSetKey,
        },
      },
    ],
  });
