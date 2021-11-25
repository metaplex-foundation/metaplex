import { WalletContextState } from '@solana/wallet-adapter-react';
import { ParsedAccount, StringPublicKey } from '@oyster/common';
import { Connection } from '@solana/web3.js';
import BN from 'bn.js';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { ExtendedVoucherByKey } from '../../../../artworks/types';

export interface RedeemPackParams {
  wallet: WalletContextState;
  connection: Connection;
  index: number;
  packSetKey: StringPublicKey;
  userToken: StringPublicKey;
  voucherMint: StringPublicKey;
  metadataMint: StringPublicKey;
  edition: BN;
}

export interface NewMintParams {
  wallet: WalletContextState;
  connection: Connection;
}

export interface RequestCardParams {
  index: number;
  packSetKey: StringPublicKey;
  edition: StringPublicKey;
  editionMint: StringPublicKey;
  tokenAccount: StringPublicKey;
  packVoucher: StringPublicKey;
  wallet: WalletContextState;
}

export interface RequestCardsParams {
  pack: ParsedAccount<PackSet>;
  userVouchers: ExtendedVoucherByKey;
  editionId: StringPublicKey;
  tokenAccount: StringPublicKey;
  wallet: WalletContextState;
  connection: Connection;
  cardsLeftToOpen: number;
}

export interface RequestCardsInstructionsParams {
  cardsLeftToOpen: number;
  packSetKey: StringPublicKey;
  edition: StringPublicKey;
  editionMint: StringPublicKey;
  tokenAccount: StringPublicKey;
  packVoucher: StringPublicKey;
  wallet: WalletContextState;
}
