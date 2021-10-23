import { AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import { StringPublicKey } from "../ids";

export const METAPLEX_PREFIX = 'metaplex';

export enum MetaplexKey {
  Uninitialized = 0,
  OriginalAuthorityLookupV1 = 1,
  BidRedemptionTicketV1 = 2,
  StoreV1 = 3,
  WhitelistedCreatorV1 = 4,
  PayoutTicketV1 = 5,
  SafetyDepositValidationTicketV1 = 6,
  AuctionManagerV1 = 7,
  PrizeTrackingTicketV1 = 8,
  SafetyDepositConfigV1 = 9,
  AuctionManagerV2 = 10,
  BidRedemptionTicketV2 = 11,
  AuctionWinnerTokenTypeTrackerV1 = 12,
}

export enum TupleNumericType {
  U8 = 1,
  U16 = 2,
  U32 = 4,
  U64 = 8,
}

export class AmountRange {
  amount: BN;
  length: BN;
  constructor(args: { amount: BN; length: BN }) {
    this.amount = args.amount;
    this.length = args.length;
  }
}

export interface ParsedAccountBase {
  pubkey: StringPublicKey;
  account: AccountInfo<Buffer>;
  info: any; // TODO: change to unknown
}

export interface ParsedAccount<T> extends ParsedAccountBase {
  info: T;
}
