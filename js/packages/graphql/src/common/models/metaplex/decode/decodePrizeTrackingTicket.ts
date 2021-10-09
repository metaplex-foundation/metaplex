import { PrizeTrackingTicket } from '../entities';
import { SCHEMA } from '../schema';
import { decodeEntity } from '../../BaseEntity';

export const decodePrizeTrackingTicket = decodeEntity(
  PrizeTrackingTicket,
  SCHEMA,
);
