import {
  AccountInfo,
} from '@solana/web3.js';

import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';

export interface TokenAccount {
  pubkey: string;
  account: AccountInfo<Buffer>;
  info: TokenAccountInfo;
}

