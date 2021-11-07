import { WalletContextState } from '@solana/wallet-adapter-react';
import { StringPublicKey } from '@oyster/common';
import { Connection } from '@solana/web3.js';
import BN from 'bn.js';

export interface RedeemPackParams {
  wallet: WalletContextState;
  connection: Connection;
  index: number;
  packSetKey: StringPublicKey;
  voucherToken: StringPublicKey;
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
