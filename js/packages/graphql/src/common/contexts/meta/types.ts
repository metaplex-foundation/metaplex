import { AccountInfo } from "@solana/web3.js";
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
} from "../../actions";
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
} from "../../models/metaplex";
import { PublicKeyStringAndAccount } from "../../utils";
import { ParsedAccount } from "../accounts/types";

export interface MetaState {
  metadata: ParsedAccount<Metadata>[];
  metadataByMint: Map<string, ParsedAccount<Metadata>>;
  metadataByMasterEdition: Map<string, ParsedAccount<Metadata>>;
  editions: Map<string, ParsedAccount<Edition>>;
  masterEditions: Map<string, ParsedAccount<MasterEditionV1 | MasterEditionV2>>;
  masterEditionsByPrintingMint: Map<string, ParsedAccount<MasterEditionV1>>;
  masterEditionsByOneTimeAuthMint: Map<string, ParsedAccount<MasterEditionV1>>;
  prizeTrackingTickets: Map<string, ParsedAccount<PrizeTrackingTicket>>;
  auctionManagersByAuction: Map<
    string,
    ParsedAccount<AuctionManagerV1 | AuctionManagerV2>
  >;
  safetyDepositConfigsByAuctionManagerAndIndex: Map<
    string,
    ParsedAccount<SafetyDepositConfig>
  >;
  bidRedemptionV2sByAuctionManagerAndWinningIndex: Map<
    string,
    ParsedAccount<BidRedemptionTicketV2>
  >;
  auctions: Map<string, ParsedAccount<AuctionData>>;
  auctionDataExtended: Map<string, ParsedAccount<AuctionDataExtended>>;
  vaults: Map<string, ParsedAccount<Vault>>;
  bidderMetadataByAuctionAndBidder: Map<string, ParsedAccount<BidderMetadata>>;
  safetyDepositBoxesByVaultAndIndex: Map<
    string,
    ParsedAccount<SafetyDepositBox>
  >;
  bidderPotsByAuctionAndBidder: Map<string, ParsedAccount<BidderPot>>;
  bidRedemptions: Map<string, ParsedAccount<BidRedemptionTicket>>;
  whitelistedCreatorsByCreator: Map<string, ParsedAccount<WhitelistedCreator>>;
  payoutTickets: Map<string, ParsedAccount<PayoutTicket>>;
  stores: Map<string, ParsedAccount<Store>>;
  creators: Map<string, ParsedAccount<WhitelistedCreator>>;
}

export interface MetaContextState extends MetaState {
  isLoading: boolean;
}

export type UpdateStateValueFunc = (
  prop: keyof Omit<MetaState, "metadata">,
  key: string,
  value: ParsedAccount<any>
) => void;

export type ProcessAccountsFunc = (
  account: PublicKeyStringAndAccount<Buffer>,
  setter: UpdateStateValueFunc
) => void;

export type CheckAccountFunc = (account: AccountInfo<Buffer>) => boolean;
