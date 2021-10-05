import { deserializeUnchecked } from "borsh";
import { BidRedemptionTicketV1 } from "./entities/BidRedemptionTicketV1";
import { BidRedemptionTicket } from "./BidRedemptionTicket";
import { BidRedemptionTicketV2 } from "./entities/BidRedemptionTicketV2";
import { SCHEMA } from "./schema";
import { MetaplexKey } from "./MetaplexKey";

export function decodeBidRedemptionTicket(buffer: Buffer) {
  return (
    buffer[0] == MetaplexKey.BidRedemptionTicketV1
      ? deserializeUnchecked(SCHEMA, BidRedemptionTicketV1, buffer)
      : new BidRedemptionTicketV2({
          key: MetaplexKey.BidRedemptionTicketV2,
          data: buffer.toJSON().data,
        })
  ) as BidRedemptionTicket;
}
