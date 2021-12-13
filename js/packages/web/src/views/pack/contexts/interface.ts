import { ParsedAccount, StringPublicKey, TokenAccount } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';

import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { PackMetadataByPackCard } from './hooks/useMetadataByPackCard';

export type PackContextProps = {
  isLoading: boolean;
  packKey: StringPublicKey;
  voucherEditionKey: StringPublicKey;
  openedMetadata: SafetyDepositDraft[];
  metadataByPackCard: PackMetadataByPackCard;
  handleOpenPack: () => Promise<void>;
  redeemModalMetadata: StringPublicKey[];
  pack?: ParsedAccount<PackSet>;
  voucherMetadataKey?: StringPublicKey;
  provingProcess?: ParsedAccount<ProvingProcess>;
};

export interface GetProvingProcessParams
  extends Omit<RequestCardsUsingVoucherParams, 'voucherKey'> {
  voucherKey?: StringPublicKey;
  provingProcessKey?: StringPublicKey;
}

export interface RequestCardsUsingVoucherParams {
  pack: ParsedAccount<PackSet>;
  voucherTokenAccount: TokenAccount;
  voucherKey: StringPublicKey;
  editionKey: StringPublicKey;
  editionMint: StringPublicKey;
  connection: Connection;
  wallet: WalletContextState;
}
