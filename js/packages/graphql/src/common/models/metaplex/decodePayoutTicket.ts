import { decodeEntry } from "./entities/BaseEntry";
import { PayoutTicket } from "./entities/PayoutTicket";

export const decodePayoutTicket = decodeEntry(PayoutTicket);
