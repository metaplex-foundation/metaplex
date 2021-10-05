import type { ObjectId } from "mongodb";
import type { MetaplexKey } from "./MetaplexKey";

export interface BidRedemptionTicket {
  _id: ObjectId;
  key: MetaplexKey;

  getBidRedeemed(order: number): boolean;
}
