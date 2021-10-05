import BN from "bn.js";
import { StringPublicKey } from "../../../utils";
import { MetaplexKey } from "../MetaplexKey";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter, BNConverter } from "../../../../api/mongo";
import { ObjectId } from "mongodb";

@Serializable()
export class PayoutTicket {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  @JsonProperty()
  key: MetaplexKey = MetaplexKey.PayoutTicketV1;

  @JsonProperty()
  recipient!: StringPublicKey;

  @JsonProperty(BNConverter)
  amountPaid!: BN;

  constructor(args?: { recipient: StringPublicKey; amountPaid: BN }) {
    this.key = MetaplexKey.PayoutTicketV1;
    if (args) {
      this.recipient = args.recipient;
      this.amountPaid = args.amountPaid;
    }
  }
}
