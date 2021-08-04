import {
  Metadata,
  ParsedAccount,
  Edition,
  AuctionData,
  SafetyDepositBox,
  BidderMetadata,
  BidderPot,
  Vault,
  AuctionDataExtended,
  MasterEditionV1,
  MasterEditionV2,
} from '@oyster/common';
import { AccountInfo, PublicKey, PublicKeyAndAccount } from '@solana/web3.js';
import {
  AuctionManager,
  BidRedemptionTicket,
  Store,
  WhitelistedCreator,
  PayoutTicket,
  PrizeTrackingTicket,
} from '../../models/metaplex';

export interface MetaState {
  metadata: ParsedAccount<Metadata>[];
  metadataByMint: Record<string, ParsedAccount<Metadata>>;
  metadataByMasterEdition: Record<string, ParsedAccount<Metadata>>;
  editions: Record<string, ParsedAccount<Edition>>;
  masterEditions: Record<
    string,
    ParsedAccount<MasterEditionV1 | MasterEditionV2>
  >;
  masterEditionsByPrintingMint: Record<string, ParsedAccount<MasterEditionV1>>;
  masterEditionsByOneTimeAuthMint: Record<
    string,
    ParsedAccount<MasterEditionV1>
  >;
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>;
  auctionManagersByAuction: Record<string, ParsedAccount<AuctionManager>>;
  auctions: Record<string, ParsedAccount<AuctionData>>;
  auctionDataExtended: Record<string, ParsedAccount<AuctionDataExtended>>;
  vaults: Record<string, ParsedAccount<Vault>>;
  store: ParsedAccount<Store> | null;
  bidderMetadataByAuctionAndBidder: Record<
    string,
    ParsedAccount<BidderMetadata>
  >;
  safetyDepositBoxesByVaultAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositBox>
  >;
  bidderPotsByAuctionAndBidder: Record<string, ParsedAccount<BidderPot>>;
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>;
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >;
  payoutTickets: Record<string, ParsedAccount<PayoutTicket>>;
}

export interface MetaContextState extends MetaState {
  isLoading: boolean;
}

export type AccountAndPubkey = {
  pubkey: PublicKey;
  account: AccountInfo<Buffer>;
};

export type UpdateStateValueFunc = (
  prop: keyof MetaState,
  key: string,
  value: ParsedAccount<any>,
) => void;

export type ProcessAccountsFunc = (
  account: PublicKeyAndAccount<Buffer>,
  setter: UpdateStateValueFunc,
) => void;

export type CheckAccountFunc = (account: AccountInfo<Buffer>) => boolean;
