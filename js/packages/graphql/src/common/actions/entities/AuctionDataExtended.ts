import BN from "bn.js";
import { ObjectId } from "mongodb";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { BNConverter, ObjectIdConverter } from "../../serialize";
@Serializable()
export class AuctionDataExtended {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  @JsonProperty()
  /// Total uncancelled bids
  totalUncancelledBids!: BN;

  @JsonProperty(BNConverter)
  tickSize!: BN | null;

  @JsonProperty()
  gapTickSizePercentage!: number | null;

  constructor(args?: {
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
  }) {
    if (args) {
      this.totalUncancelledBids = args.totalUncancelledBids;
      this.tickSize = args.tickSize;
      this.gapTickSizePercentage = args.gapTickSizePercentage;
    }
  }
}
