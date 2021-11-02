import { SCHEMA } from '../schema';
import { decodeEntity } from '../../BaseEntity';
import { PayoutTicket } from '../entities';

export const decodePayoutTicket = decodeEntity(PayoutTicket, SCHEMA);
