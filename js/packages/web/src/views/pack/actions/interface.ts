import {
  MetaState,
  ParsedAccount,
  StringPublicKey,
  TokenAccount,
} from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';

import { ExtendedVoucherByKey } from '../../artworks/types';
import { PackMetadataByPackCard } from '../hooks/useMetadataByPackCard';

export interface OpenPackParams
  extends Pick<MetaState, 'packCards' | 'masterEditions'> {
  pack: ParsedAccount<PackSet>;
  voucherEditionKey: StringPublicKey;
  userVouchers: ExtendedVoucherByKey;
  accountByMint: Map<string, TokenAccount>;
  connection: Connection;
  wallet: WalletContextState;
  metadataByPackCard: PackMetadataByPackCard;
}

export interface FetchProvingProcessWithRetryParams {
  voucherMint: PublicKey;
  packKey: PublicKey;
  walletKey: PublicKey;
  connection: Connection;
}
