import BN from "bn.js";
import { MetaplexKey } from "../MetaplexKey";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter, BNConverter } from "../../../../api/mongo";
import { ObjectId } from "mongodb";

@Serializable()
export class PrizeTrackingTicket {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  @JsonProperty()
  key: MetaplexKey = MetaplexKey.PrizeTrackingTicketV1;

  @JsonProperty()
  metadata!: string;

  @JsonProperty(BNConverter)
  supplySnapshot!: BN;

  @JsonProperty(BNConverter)
  expectedRedemptions!: BN;

  @JsonProperty(BNConverter)
  redemptions!: BN;

  constructor(args?: {
    metadata: string;
    supplySnapshot: BN;
    expectedRedemptions: BN;
    redemptions: BN;
  }) {
    if (args) {
      this.metadata = args.metadata;
      this.supplySnapshot = args.supplySnapshot;
      this.expectedRedemptions = args.expectedRedemptions;
      this.redemptions = args.redemptions;
    }
  }
}
