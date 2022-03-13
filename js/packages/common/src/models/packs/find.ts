import { PublicKey } from '@solana/web3.js';
import {
  StringPublicKey,
  findProgramAddress,
  toPublicKey,
  programIds,
} from '../..';

export const PACKS_PREFIX = 'packs';
export const CARD_PREFIX = 'card';
export const VOUCHER_PREFIX = 'voucher';
export const PROVING_PROCESS_PREFIX = 'proving';
export const CONFIG_PREFIX = 'config';

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

export async function findProvingProcessProgramAddress(
  packSetKey: PublicKey,
  userWallet: PublicKey,
  voucherMint: PublicKey,
): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(PROVING_PROCESS_PREFIX),
        packSetKey.toBuffer(),
        userWallet.toBuffer(),
        voucherMint.toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.pack_create),
    )
  )[0];
}

export async function findPackConfigProgramAddress(
  packSetKey: PublicKey,
): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [Buffer.from(CONFIG_PREFIX), packSetKey.toBuffer()],
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
