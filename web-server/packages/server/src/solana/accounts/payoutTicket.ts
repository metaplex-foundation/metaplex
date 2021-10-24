import BN from "bn.js";
import { deserializeUnchecked } from "borsh";
import { StringPublicKey } from "../ids";
import { MetaplexKey } from "./types";

export class PayoutTicket {
    key: MetaplexKey = MetaplexKey.PayoutTicketV1;
    recipient: StringPublicKey;
    amountPaid: BN;

    constructor(args: { recipient: StringPublicKey; amountPaid: BN }) {
      this.key = MetaplexKey.PayoutTicketV1;
      this.recipient = args.recipient;
      this.amountPaid = args.amountPaid;
    }
  }

  const PayoutTicketSchema = new Map<any, any>([
    [
      PayoutTicket,
      {
        kind: "struct",
        fields: [
          ["key", "u8"],
          ["recipient", "pubkeyAsString"],
          ["amountPaid", "u64"],
        ],
      },
    ],
  ]);

  export const decodePayoutTicket = (buffer: Buffer) => {
    return deserializeUnchecked(PayoutTicketSchema, PayoutTicket, buffer) as PayoutTicket;
  };