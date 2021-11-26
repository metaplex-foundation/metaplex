import { ParsedAccount, StringPublicKey, TokenAccount } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';

import { ExtendedVoucherByKey } from '../../../../artworks/types';

export interface OpenPackParams {
  pack: ParsedAccount<PackSet>;
  voucherEditionKey: StringPublicKey;
  userVouchers: ExtendedVoucherByKey;
  accountByMint: Map<string, TokenAccount>;
  connection: Connection;
  wallet: WalletContextState;
}

export interface FetchProvingProcessWithRetryParams {
  editionMint: PublicKey;
  packKey: PublicKey;
  walletKey: PublicKey;
  connection: Connection;
}
