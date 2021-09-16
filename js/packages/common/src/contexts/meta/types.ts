import { AccountInfo } from '@solana/web3.js';
import {
  AuctionData,
  AuctionDataExtended,
  BidderMetadata,
  BidderPot,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  SafetyDepositBox,
  Vault,
} from '../../actions';
import {
  AuctionManagerV1,
  AuctionManagerV2,
  BidRedemptionTicket,
  BidRedemptionTicketV2,
  PayoutTicket,
  PrizeTrackingTicket,
  SafetyDepositConfig,
  Store,
  WhitelistedCreator,
} from '../../models/metaplex';
import { PublicKeyStringAndAccount } from '../../utils';
import { ParsedAccount } from '../accounts/types';

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
  auctionManagersByAuction: Record<
    string,
    ParsedAccount<AuctionManagerV1 | AuctionManagerV2>
  >;
  safetyDepositConfigsByAuctionManagerAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositConfig>
  >;
  bidRedemptionV2sByAuctionManagerAndWinningIndex: Record<
    string,
    ParsedAccount<BidRedemptionTicketV2>
  >;
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
  stores: Record<string, ParsedAccount<Store>>;
  creators: Record<string, ParsedAccount<WhitelistedCreator>>;
}

export interface MetaContextState extends MetaState {
  isLoading: boolean;
}

export type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfo<Buffer>;
};

export type UpdateStateValueFunc = (
  prop: keyof MetaState,
  key: string,
  value: ParsedAccount<any>,
) => void;

export type ProcessAccountsFunc = (
  account: PublicKeyStringAndAccount<Buffer>,
  setter: UpdateStateValueFunc,
  useAll: boolean,
) => void;

export type CheckAccountFunc = (account: AccountInfo<Buffer>) => boolean;
