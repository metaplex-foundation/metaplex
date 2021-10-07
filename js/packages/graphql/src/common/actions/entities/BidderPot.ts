import { StringPublicKey } from "../../utils";
import { ObjectId } from "mongodb";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../serialize";

@Serializable()
export class BidderPot {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  /// Points at actual pot that is a token account
  @JsonProperty()
  bidderPot!: StringPublicKey;

  @JsonProperty()
  bidderAct!: StringPublicKey;

  @JsonProperty()
  auctionAct!: StringPublicKey;

  @JsonProperty()
  emptied!: boolean;
  constructor(args?: {
    bidderPot: StringPublicKey;
    bidderAct: StringPublicKey;
    auctionAct: StringPublicKey;
    emptied: boolean;
  }) {
    if (args) {
      this.bidderPot = args.bidderPot;
      this.bidderAct = args.bidderAct;
      this.auctionAct = args.auctionAct;
      this.emptied = args.emptied;
    }
  }
}
