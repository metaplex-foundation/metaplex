import { PublicKey } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import { TokenAccount } from './account';
import {
  StringPublicKey,
  WRAPPED_SOL_MINT,
  AccountInfoOwnerString,
} from '../../utils';

export function wrapNativeAccount(
  pubkey: StringPublicKey,
  account?: AccountInfoOwnerString<Buffer>,
): TokenAccount | undefined {
  if (!account) {
    return undefined;
  }

  const key = new PublicKey(pubkey);

  return {
    pubkey: pubkey,
    account,
    info: {
      address: key,
      mint: WRAPPED_SOL_MINT,
      owner: key,
      amount: new u64(account.lamports),
      delegate: null,
      delegatedAmount: new u64(0),
      isInitialized: true,
      isFrozen: false,
      isNative: true,
      rentExemptReserve: null,
      closeAuthority: null,
    },
  };
}
