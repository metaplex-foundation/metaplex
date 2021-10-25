import {
  AccountParser,
  decodeAuctionManager,
  decodeBidderPot,
  decodeBidRedemptionTicket,
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  decodePayoutTicket,
  decodeSafetyDeposit,
  decodeSafetyDepositConfig,
  decodeVault,
  decodeWhitelistedCreator,
  StringPublicKey,
} from '@oyster/common';
import { PublicKey } from '@solana/web3.js';

export type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfo<Buffer>;
};

export type AccountInfo<T> = {
  executable: boolean;
  owner: PublicKey;
  lamports: number;
  data: T;
};

export const WhitelistedCreatorParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeWhitelistedCreator(account.data),
});

export const WhitelistedMetadataParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeMetadata(account.data),
});

export const WhitelistedMasterEditionVParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeMasterEdition(account.data),
});

export const WhitelistedAuctionManagerParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeAuctionManager(account.data),
});

export const WhitelistedBidRedemptionTicketParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeBidRedemptionTicket(account.data),
});

export const WhitelistedSafetyDepositConfigParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeSafetyDepositConfig(account.data),
});

export const WhitelistedEditionParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeEdition(account.data),
});

export const WhitelistedVaultParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeVault(account.data),
});

export const WhitelistedSafetyDepositParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeSafetyDeposit(account.data),
});

export const BidderPotParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeBidderPot(account.data),
});

export const PayoutTicket: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodePayoutTicket(account.data),
});
