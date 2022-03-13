import { ParsedAccount, StringPublicKey, TokenAccount } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';

import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { VoucherByKey } from '../../../types/packs';
import { PackMetadataByPackCard } from './hooks/useMetadataByPackCard';

export type PackContextProps = {
  isLoading: boolean;
  packKey: StringPublicKey;
  voucherMint: StringPublicKey;
  openedMetadata: SafetyDepositDraft[];
  metadataByPackCard: PackMetadataByPackCard;
  handleOpenPack: () => Promise<void>;
  redeemModalMetadata: StringPublicKey[];
  pack?: ParsedAccount<PackSet>;
  voucherMetadataKey?: StringPublicKey;
  provingProcess?: ParsedAccount<ProvingProcess>;
};

export interface GetProvingProcessParams {
  pack: ParsedAccount<PackSet>;
  voucherMint?: StringPublicKey;
  provingProcess?: ParsedAccount<ProvingProcess>;
  vouchers: VoucherByKey;
  accountByMint: Map<string, TokenAccount>;
  connection: Connection;
  wallet: WalletContextState;
}

export interface RequestCardsUsingVoucherParams {
  pack: ParsedAccount<PackSet>;
  cardsLeftToOpen: number;
  voucherTokenAccount?: TokenAccount;
  voucherKey: StringPublicKey;
  editionKey: StringPublicKey;
  editionMint: StringPublicKey;
  connection: Connection;
  wallet: WalletContextState;
}
