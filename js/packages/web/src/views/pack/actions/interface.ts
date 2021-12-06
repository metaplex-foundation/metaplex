import {
  MetaState,
  ParsedAccount,
  StringPublicKey,
  TokenAccount,
} from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';

import { ExtendedVoucherByKey } from '../../artworks/types';
import { PackMetadataByPackCard } from '../hooks/useMetadataByPackCard';

export interface OpenPackParams
  extends GetProvingProcessParams,
    Pick<MetaState, 'packCards' | 'masterEditions'> {
  metadataByPackCard: PackMetadataByPackCard;
}

export interface GetProvingProcessParams
  extends Omit<RequestCardsUsingVoucherParams, 'voucherEditionKey'> {
  voucherEditionKey?: StringPublicKey;
  provingProcess?: ParsedAccount<ProvingProcess>;
}

export interface RequestCardsUsingVoucherParams {
  pack: ParsedAccount<PackSet>;
  voucherEditionKey: StringPublicKey;
  userVouchers: ExtendedVoucherByKey;
  accountByMint: Map<string, TokenAccount>;
  connection: Connection;
  wallet: WalletContextState;
}

export interface FetchProvingProcessWithRetryParams {
  voucherMint: PublicKey;
  packKey: PublicKey;
  walletKey: PublicKey;
  connection: Connection;
}
