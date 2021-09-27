import dedent from "dedent";
import { enumType, objectType } from "nexus";
import { wrapPubkey } from "../utils/mapInfo";
import { Artwork } from "./artwork";
import { AuctionManager } from "./metaplex";

export const AuctionState = enumType({
  name: "AuctionState",
  members: {
    Created: 0,
    Started: 1,
    Ended: 2,
  },
});

export const BidStateType = enumType({
  name: "BidStateType",
  members: {
    EnglishAuction: 0,
    OpenEdition: 1,
  },
});

export const Bid = objectType({
  name: "Bid",
  definition(t) {
    t.pubkey("key");
    t.bn("amount");
  },
});

// TODO: has extra props/methods
export const BidState = objectType({
  name: "BidState",
  definition(t) {
    t.field("type", { type: BidStateType });
    t.list.field("bids", { type: Bid });
    t.bn("max");
  },
});

export const PriceFloorType = enumType({
  name: "PriceFloorType",
  members: {
    None: 0,
    Minimum: 1,
    BlindedPrice: 2,
  },
});

// TODO: has extra props/methods
export const PriceFloor = objectType({
  name: "PriceFloor",
  definition(t) {
    t.field("type", { type: PriceFloorType });
    t.nullable.bn("minPrice");
    t.uint8("hash", {
      description: dedent`
      It's an array of 32 u8s, when minimum, only first 8 are used (a u64), when blinded price, the entire
      thing is a hash and not actually a public key, and none is all zeroes
    `,
    });
  },
});

export const Auction = objectType({
  name: "Auction",
  definition(t) {
    t.nonNull.pubkey("pubkey");
    t.pubkey("authority", {
      description:
        "Pubkey of the authority with permission to modify this auction.",
    });
    t.pubkey("tokenMint", {
      description: "Token mint for the SPL token being used to bid",
    });
    t.nullable.bn("lastBid", {
      description:
        "The time the last bid was placed, used to keep track of auction timing.",
    });
    t.nullable.bn("endedAt", {
      description: "Slot time the auction was officially ended by.",
    });
    t.nullable.bn("endAuctionAt", {
      description:
        "End time is the cut-off point that the auction is forced to end by.",
    });
    t.nullable.bn("auctionGap", {
      description:
        "Gap time is the amount of time in slots after the previous bid at which the auction ends.",
    });
    t.field("priceFloor", {
      type: PriceFloor,
      description: "Minimum price for any bid to meet.",
    });
    t.field("state", {
      type: AuctionState,
      description:
        "The state the auction is in, whether it has started or ended.",
    });
    t.field("bidState", {
      type: BidState,
      description: "Auction Bids, each user may have one bid open at a time.",
    });
    t.nullable.pubkey("bidRedemptionKey", {
      description:
        "Used for precalculation on the front end, not a backend key",
    });
    t.field("manager", {
      type: AuctionManager,
    });
    t.field("trumbnail", {
      type: Artwork,
      resolve: (item, args, { api }) => api.getAuctionThumbnail(item),
    });
    t.field("highestBid", {
      type: BidderMetadata,
      resolve: (item, args, { api }) =>
        api.getAuctionHighestBid(item).then((item) => wrapPubkey(item)),
    });
    t.bn("numWinners", {
      resolve: (item) => item.bidState.max,
    });
  },
});

export const AuctionDataExtended = objectType({
  name: "AuctionDataExtended",
  definition(t) {
    t.bn("totalUncancelledBids");
    t.nullable.bn("tickSize");
    t.nullable.int("gapTickSizePercentage");
  },
});

export const BidderMetadata = objectType({
  name: "BidderMetadata",
  definition(t) {
    t.pubkey("bidderPubkey", {
      description: "Relationship with the bidder who's metadata this covers.",
    });
    t.pubkey("auctionPubkey", {
      description: "Relationship with the auction this bid was placed on.",
    });
    t.bn("lastBid", { description: "Amount that the user bid" });
    t.bn("lastBidTimestamp", {
      description: "Tracks the last time this user bid.",
    });
    t.boolean("cancelled", {
      description: dedent`
      Whether the last bid the user made was cancelled. This should also be enough to know if the
      user is a winner, as if cancelled it implies previous bids were also cancelled.
    `,
    });
  },
});

export const BidderPot = objectType({
  name: "BidderPot",
  definition(t) {
    t.pubkey("bidderPot", {
      description: "Points at actual pot that is a token account",
    });
    t.pubkey("bidderAct");
    t.pubkey("auctionAct");
    t.boolean("emptied");
  },
});
