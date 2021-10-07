import BN from "bn.js";
import { StringPublicKey } from "../../utils";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { BNConverter, ObjectIdConverter } from "../../serialize";
import { ObjectId } from "mongodb";

@Serializable()
export class BidderMetadata {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  // Relationship with the bidder who's metadata this covers.
  @JsonProperty()
  bidderPubkey!: StringPublicKey;

  // Relationship with the auction this bid was placed on.
  @JsonProperty()
  auctionPubkey!: StringPublicKey;

  // Amount that the user bid.
  @JsonProperty(BNConverter)
  lastBid!: BN;
  // Tracks the last time this user bid.
  @JsonProperty(BNConverter)
  lastBidTimestamp!: BN;

  // Whether the last bid the user made was cancelled. This should also be enough to know if the
  // user is a winner, as if cancelled it implies previous bids were also cancelled.
  @JsonProperty()
  cancelled!: boolean;

  constructor(args?: {
    bidderPubkey: StringPublicKey;
    auctionPubkey: StringPublicKey;
    lastBid: BN;
    lastBidTimestamp: BN;
    cancelled: boolean;
  }) {
    if (args) {
      this.bidderPubkey = args.bidderPubkey;
      this.auctionPubkey = args.auctionPubkey;
      this.lastBid = args.lastBid;
      this.lastBidTimestamp = args.lastBidTimestamp;
      this.cancelled = args.cancelled;
    }
  }
}
