import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TokenAccount } from '@oyster/common';

import { PackState, SelectedItem, SelectedVoucher } from '../interface';

export interface CreatePackParams {
  wallet: WalletContextState;
  connection: Connection;
  accountByMint: Map<string, TokenAccount>;
  data: PackState;
}

export interface GetCreateAccountParams {
  walletPublicKey: PublicKey;
  newAccountPubkey: PublicKey;
  connection: Connection;
  space: number;
  programId: PublicKey;
}

export interface GetCreateTokenAccounts {
  walletPublicKey: PublicKey;
  connection: Connection;
  cardsToAdd: SelectedItem[];
}

interface BaseParams {
  walletPublicKey: PublicKey;
  packSetKey: PublicKey;
}

export interface GetInitPackSetParams extends BaseParams {
  data: PackState;
}

export interface GetAddCardToPackParams extends BaseParams {
  selectedItems: SelectedItem[];
}

export interface GetAddVoucherToPackParams extends BaseParams {
  selectedVouchers: SelectedVoucher[];
}

export interface GetActivateParams extends BaseParams {}
