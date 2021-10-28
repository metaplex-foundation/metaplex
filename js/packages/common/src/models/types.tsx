import { AccountInfo } from '@solana/web3.js';
import {
  AccountParser,
  decodeAuction,
  decodeAuctionDataExtended,
  decodeAuctionManager,
  decodeBidRedemptionTicket,
  decodeMasterEdition,
  decodeMetadata,
  decodeSafetyDeposit,
  decodeSafetyDepositConfig,
  decodeVault,
  StringPublicKey,
} from '..';

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

export const AuctionDataExtendedParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeAuctionDataExtended(account.data),
});

export const AuctionParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeAuction(account.data),
});

export const WhitelistedVaultParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeVault(account.data),
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

export const WhitelistedSafetyDepositParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeSafetyDeposit(account.data),
});

export const WhitelistedAuctionManagerParser: AccountParser = (
  pubkey: StringPublicKey,
  account: AccountInfo<Buffer>,
) => ({
  pubkey,
  account,
  info: decodeAuctionManager(account.data),
});
