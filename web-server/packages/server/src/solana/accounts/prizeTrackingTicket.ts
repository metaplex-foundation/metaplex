import BN from "bn.js";
import { deserializeUnchecked } from "borsh";
import { MetaplexKey } from "./types";

export class PrizeTrackingTicket {
  key: MetaplexKey = MetaplexKey.PrizeTrackingTicketV1;
  metadata: string;
  supplySnapshot: BN;
  expectedRedemptions: BN;
  redemptions: BN;

  constructor(args: {
    metadata: string;
    supplySnapshot: BN;
    expectedRedemptions: BN;
    redemptions: BN;
  }) {
    this.key = MetaplexKey.PrizeTrackingTicketV1;
    this.metadata = args.metadata;
    this.supplySnapshot = args.supplySnapshot;
    this.expectedRedemptions = args.expectedRedemptions;
    this.redemptions = args.redemptions;
  }
}

const PRIZE_TRACKING_TICKET_SCHEMA = new Map<any, any>([
  [
    PrizeTrackingTicket,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["metadata", "pubkeyAsString"],
        ["supplySnapshot", "u64"],
        ["expectedRedemptions", "u64"],
        ["redemptions", "u64"],
      ],
    },
  ],
]);

export const decodePrizeTrackingTicket = (buffer: Buffer) => {
  return deserializeUnchecked(
    PRIZE_TRACKING_TICKET_SCHEMA,
    PrizeTrackingTicket,
    buffer
  ) as PrizeTrackingTicket;
};
