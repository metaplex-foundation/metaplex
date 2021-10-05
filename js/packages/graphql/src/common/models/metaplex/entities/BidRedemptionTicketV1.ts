import { ObjectId } from "mongodb";
import { MetaplexKey } from "../MetaplexKey";
import { BidRedemptionTicket } from "../BidRedemptionTicket";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../../../api/mongo";
@Serializable()
export class BidRedemptionTicketV1 implements BidRedemptionTicket {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  @JsonProperty()
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV1;

  @JsonProperty()
  participationRedeemed: boolean = false;

  @JsonProperty()
  itemsRedeemed: number = 0;

  constructor(args?: BidRedemptionTicketV1) {
    Object.assign(this, args);
  }

  getBidRedeemed(): boolean {
    return this.participationRedeemed;
  }
}
