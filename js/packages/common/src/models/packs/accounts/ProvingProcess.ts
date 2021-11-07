import { Connection, PublicKey } from '@solana/web3.js';
import { deserializeUnchecked } from 'borsh';

import { PackKey, MAX_PACK_PROVING_PROCESS_SIZE } from '..';
import {
  AccountAndPubkey,
  PACK_CREATE_ID,
  StringPublicKey,
  toPublicKey,
} from '../../..';
import { getProgramAccounts } from '../../../contexts/meta/web3';

export class ProvingProcess {
  key: PackKey = PackKey.ProvingProcess;
  voucherMint: StringPublicKey;
  packSet: StringPublicKey;
  nextCardToRedeem: number;
  cardsRedeemed: number;

  constructor(args: {
    key: PackKey;
    voucherMint: StringPublicKey;
    packSet: StringPublicKey;
    nextCardToRedeem: number;
    cardsRedeemed: number;
  }) {
    this.key = PackKey.PackSet;
    this.voucherMint = args.voucherMint;
    this.packSet = args.packSet;
    this.nextCardToRedeem = args.nextCardToRedeem;
    this.cardsRedeemed = args.cardsRedeemed;
  }
}

export const PACK_PROVING_PROCESS_SCHEMA = new Map<any, any>([
  [
    ProvingProcess,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['voucherMint', 'pubkeyAsString'],
        ['packSet', 'pubkeyAsString'],
        ['nextCardToRedeem', 'u32'],
        ['cardsRedeemed', 'u32'],
      ],
    },
  ],
]);

export const decodePackProvingProcess = (buffer: Buffer) => {
  return deserializeUnchecked(
    PACK_PROVING_PROCESS_SCHEMA,
    ProvingProcess,
    buffer,
  ) as ProvingProcess;
};

export const getProvingProcessByPackSet = ({
  connection,
  packSetKey,
}: {
  connection: Connection;
  packSetKey: StringPublicKey;
}): Promise<AccountAndPubkey[]> =>
  getProgramAccounts(connection, PACK_CREATE_ID.toString(), {
    filters: [
      {
        dataSize: MAX_PACK_PROVING_PROCESS_SIZE,
      },
      {
        memcmp: {
          offset: 1 + 32,
          bytes: toPublicKey(packSetKey).toBase58(),
        },
      },
    ],
  });

export const getProvingProcessByVoucherMint = ({
  connection,
  voucherMint,
}: {
  connection: Connection;
  voucherMint: StringPublicKey;
}): Promise<AccountAndPubkey[]> =>
  getProgramAccounts(connection, PACK_CREATE_ID.toString(), {
    filters: [
      {
        dataSize: MAX_PACK_PROVING_PROCESS_SIZE,
      },
      {
        memcmp: {
          offset: 1,
          bytes: toPublicKey(voucherMint).toBase58(),
        },
      },
    ],
  });

export const getProvingProcessByPubkey = async (
  connection: Connection,
  pubkey: StringPublicKey,
) => {
  const info = await connection.getAccountInfo(new PublicKey(pubkey));
  if (!info) {
    throw new Error(`Unable to find account: ${pubkey}`);
  }

  return { ...info, data: decodePackProvingProcess(Buffer.from(info?.data)) };
};
