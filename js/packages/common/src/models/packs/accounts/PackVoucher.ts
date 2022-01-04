import { Connection } from '@solana/web3.js';
import { deserializeUnchecked } from 'borsh';

import { PackKey, MAX_PACK_VOUCHER_SIZE } from '..';
import {
  AccountAndPubkey,
  PACK_CREATE_ID,
  StringPublicKey,
  toPublicKey,
} from '../../..';
import { getProgramAccounts } from '../../../contexts/meta/web3';

export class PackVoucher {
  key: PackKey = PackKey.PackVoucher;
  packSet: StringPublicKey;
  master: StringPublicKey;
  metadata: StringPublicKey;

  constructor(args: {
    key: PackKey;
    packSet: StringPublicKey;
    master: StringPublicKey;
    metadata: StringPublicKey;
  }) {
    this.key = PackKey.PackSet;
    this.packSet = args.packSet;
    this.master = args.master;
    this.metadata = args.metadata;
  }
}

export const PACK_VOUCHER_SCHEMA = new Map<any, any>([
  [
    PackVoucher,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['packSet', 'pubkeyAsString'],
        ['master', 'pubkeyAsString'],
        ['metadata', 'pubkeyAsString'],
      ],
    },
  ],
]);

export const decodePackVoucher = (buffer: Buffer) => {
  return deserializeUnchecked(
    PACK_VOUCHER_SCHEMA,
    PackVoucher,
    buffer,
  ) as PackVoucher;
};

export const getVouchersByPackSet = ({
  connection,
  packSetKey,
}: {
  connection: Connection;
  packSetKey: StringPublicKey;
}): Promise<AccountAndPubkey[]> =>
  getProgramAccounts(connection, PACK_CREATE_ID.toString(), {
    filters: [
      {
        dataSize: MAX_PACK_VOUCHER_SIZE,
      },
      {
        memcmp: {
          offset: 1,
          bytes: toPublicKey(packSetKey).toBase58(),
        },
      },
    ],
  });
