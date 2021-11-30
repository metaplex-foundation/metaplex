import { WalletContextState } from '@solana/wallet-adapter-react';
import { MetaState, ParsedAccount, StringPublicKey } from '@oyster/common';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

import { ExtendedVoucherByKey } from '../../../../artworks/types';
import { PackMetadataByPackCard } from '../hooks/useMetadataByPackCard';

export interface GenerateTransactionsResponse {
  instructions: TransactionInstruction[];
  signers: Keypair[];
}

export interface ClaimPackCardsParams
  extends Pick<MetaState, 'packCards' | 'masterEditions'> {
  wallet: WalletContextState;
  connection: Connection;
  packSetKey: PublicKey;
  voucherMint: StringPublicKey;
  cardsToRedeem: Map<number, number>;
  metadataByPackCard: PackMetadataByPackCard;
}

export interface ClaimSeveralCardsByIndexParams
  extends Pick<MetaState, 'packCards' | 'masterEditions'> {
  wallet: WalletContextState;
  connection: Connection;
  packSetKey: PublicKey;
  numberOfCards: number;
  voucherMint: StringPublicKey;
  index: number;
  metadataByPackCard: PackMetadataByPackCard;
}
export interface GenerateClaimPackInstructionsParams {
  wallet: WalletContextState;
  connection: Connection;
  index: number;
  packSetKey: PublicKey;
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
  voucherEditionKey: StringPublicKey;
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
