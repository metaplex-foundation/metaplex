import { Connection, PublicKey } from '@solana/web3.js';
import { deserializeUnchecked } from 'borsh';

import { PackKey, MAX_PACK_PROVING_PROCESS_SIZE } from '..';
import {
  AccountAndPubkey,
  PACK_CREATE_ID,
  ParsedAccount,
  StringPublicKey,
  toPublicKey,
} from '../../..';
import { getProgramAccounts } from '../../../contexts/meta/web3';

export class ProvingProcess {
  key: PackKey = PackKey.ProvingProcess;
  walletKey: StringPublicKey;
  isExhausted: Boolean;
  voucherMint: StringPublicKey;
  packSet: StringPublicKey;
  cardsToRedeem: Map<number, number>;
  cardsRedeemed: number;

  constructor(args: {
    key: PackKey;
    walletKey: StringPublicKey;
    isExhausted: Boolean;
    voucherMint: StringPublicKey;
    packSet: StringPublicKey;
    cardsToRedeem: Map<number, number>;
    cardsRedeemed: number;
  }) {
    this.key = PackKey.PackSet;
    this.walletKey = args.walletKey;
    this.isExhausted = Boolean(args.isExhausted);
    this.voucherMint = args.voucherMint;
    this.packSet = args.packSet;
    this.cardsToRedeem = args.cardsToRedeem;
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
        ['walletKey', 'pubkeyAsString'],
        ['isExhausted', 'u8'],
        ['voucherMint', 'pubkeyAsString'],
        ['packSet', 'pubkeyAsString'],
        ['cardsRedeemed', 'u32'],
        ['cardsToRedeem', 'map32'], //BTreeMap<u32, u32>
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

export const getProvingProcessByPackSetAndWallet = ({
  connection,
  packSetKey,
  walletKey,
}: {
  connection: Connection;
  packSetKey: StringPublicKey;
  walletKey: PublicKey;
}): Promise<AccountAndPubkey[]> =>
  getProgramAccounts(connection, PACK_CREATE_ID.toString(), {
    filters: [
      {
        dataSize: MAX_PACK_PROVING_PROCESS_SIZE,
      },
      {
        memcmp: {
          offset: 1,
          bytes: toPublicKey(walletKey).toBase58(),
        },
      },
      {
        memcmp: {
          offset: 1 + 32 + 1 + 32,
          bytes: toPublicKey(packSetKey).toBase58(),
        },
      },
    ],
  });

export const getProvingProcessByPubkey = async (
  connection: Connection,
  pubkey: StringPublicKey,
): Promise<ParsedAccount<ProvingProcess>> => {
  const info = await connection.getAccountInfo(new PublicKey(pubkey));
  if (!info) {
    throw new Error(`Unable to find account: ${pubkey}`);
  }

  return {
    pubkey,
    account: info,
    info: decodePackProvingProcess(Buffer.from(info?.data)),
  };
};
