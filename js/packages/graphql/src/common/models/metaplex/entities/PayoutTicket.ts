import BN from "bn.js";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { BNConverter } from "../../../../api/mongo";
import { StringPublicKey } from "../../../utils";
import { MetaplexKey } from "../MetaplexKey";
import { BaseEntry } from "./BaseEntry";

@Serializable()
export class PayoutTicket extends BaseEntry {
  @JsonProperty()
  key: MetaplexKey = MetaplexKey.PayoutTicketV1;

  @JsonProperty()
  recipient!: StringPublicKey;

  @JsonProperty(BNConverter)
  amountPaid!: BN;

  constructor(args?: { recipient: StringPublicKey; amountPaid: BN }) {
    super();

    this.key = MetaplexKey.PayoutTicketV1;
    if (args) {
      this.recipient = args.recipient;
      this.amountPaid = args.amountPaid;
    }
  }
}
