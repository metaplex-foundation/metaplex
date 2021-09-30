import {
  AuctionData,
  AuctionState,
  BidderMetadata,
  BidderPot,
  isAuctionEnded
} from "../actions/auction";
import {
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata
} from "../actions/metadata";
import { SafetyDepositBox, Vault } from "../actions/vault";
import { ParsedAccount } from "../contexts/accounts/types";
import { MetaState } from "../contexts/meta/types";
import { StringPublicKey } from "../utils/ids";
import {
  AmountRange,
  AuctionManager, AuctionViewItem,
  BidRedemptionTicket, ParticipationConfigV2, WinningConfigType
} from "./metaplex";

export interface SafetyDepositDraft {
  metadata: ParsedAccount<Metadata>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
  edition?: ParsedAccount<Edition>;
  holding: StringPublicKey;
  printingMintHolding?: StringPublicKey;
  winningConfigType: WinningConfigType;
  amountRanges: AmountRange[];
  participationConfig?: ParticipationConfigV2;
}

export enum AuctionViewState {
  Live = "0",
  Upcoming = "1",
  Ended = "2",
  BuyNow = "3",
  Defective = "-1",
}

// Flattened surface item for easy display
export interface AuctionView {
  // items 1:1 with winning configs FOR NOW
  // once tiered auctions come along, this becomes an array of arrays.
  items: AuctionViewItem[][];
  safetyDepositBoxes: ParsedAccount<SafetyDepositBox>[];
  auction: ParsedAccount<AuctionData>;
  auctionManager: AuctionManager;
  participationItem?: AuctionViewItem;
  state: AuctionViewState;
  thumbnail: AuctionViewItem;
  myBidderMetadata?: ParsedAccount<BidderMetadata>;
  myBidderPot?: ParsedAccount<BidderPot>;
  myBidRedemption?: ParsedAccount<BidRedemptionTicket>;
  vault: ParsedAccount<Vault>;
  totallyComplete: boolean;
}

export function buildListWhileNonZero<T>(hash: Map<string, T>, key: string) {
  const list: T[] = [];
  let ticket = hash.get(`${key}-0`);
  if (ticket) {
    list.push(ticket);
    let i = 1;
    while (ticket) {
      ticket = hash.get(`${key}-${i.toString()}`);
      if (ticket) list.push(ticket);
      i++;
    }
  }
  return list;
}

export function getAuctionState(auction: AuctionData): AuctionViewState {
  if (isAuctionEnded(auction)) {
    return AuctionViewState.Ended;
  }
  if (auction.state === AuctionState.Started) {
    return AuctionViewState.Live;
  }
  if (auction.state === AuctionState.Created) {
    return AuctionViewState.Upcoming;
  }
  return AuctionViewState.BuyNow;
}

export function getSafetyDepositBoxes(
  vaultId: StringPublicKey,
  safetyDepositBoxesByVaultAndIndex: MetaState["safetyDepositBoxesByVaultAndIndex"]
) {
  return buildListWhileNonZero(safetyDepositBoxesByVaultAndIndex, vaultId);
}

export function getAuctionBids(
  bidderMetadataByAuctionAndBidder: ParsedAccount<BidderMetadata>[],
  auctionId?: StringPublicKey
) {
  return bidderMetadataByAuctionAndBidder
    .filter((bid) => {
      bid.info.auctionPubkey === auctionId;
    })
    .sort((a, b) => {
      const lastBidDiff = b.info.lastBid.sub(a.info.lastBid).toNumber();
      if (lastBidDiff === 0) {
        return a.info.lastBidTimestamp.sub(b.info.lastBidTimestamp).toNumber();
      }

      return lastBidDiff;
    });
}
