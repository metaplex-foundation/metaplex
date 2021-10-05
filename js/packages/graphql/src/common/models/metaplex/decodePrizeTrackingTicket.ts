import { deserializeUnchecked } from "borsh";
import { PrizeTrackingTicket } from "./entities/PrizeTrackingTicket";
import { SCHEMA } from "./schema";

export function decodePrizeTrackingTicket(buffer: Buffer) {
  return deserializeUnchecked(
    SCHEMA,
    PrizeTrackingTicket,
    buffer
  ) as PrizeTrackingTicket;
}
