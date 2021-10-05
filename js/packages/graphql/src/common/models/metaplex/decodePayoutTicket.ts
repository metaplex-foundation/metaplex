import { deserializeUnchecked } from "borsh";
import { PayoutTicket } from "./entities/PayoutTicket";
import { SCHEMA } from "./schema";

export function decodePayoutTicket(buffer: Buffer) {
  return deserializeUnchecked(SCHEMA, PayoutTicket, buffer) as PayoutTicket;
}
