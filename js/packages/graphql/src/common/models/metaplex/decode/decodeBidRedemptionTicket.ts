import { BidRedemptionTicketV1, BidRedemptionTicketV2 } from '../entities';
import { BidRedemptionTicket } from '../BidRedemptionTicket';
import { SCHEMA } from '../schema';
import { MetaplexKey } from '../MetaplexKey';
import { decodeEntity } from '../../BaseEntity';

const decodeBidRedemptionTicketV1 = decodeEntity(BidRedemptionTicketV1, SCHEMA);

export function decodeBidRedemptionTicket(buffer: Buffer, pubkey: string) {
  return (
    buffer[0] == MetaplexKey.BidRedemptionTicketV1
      ? decodeBidRedemptionTicketV1(buffer, pubkey)
      : new BidRedemptionTicketV2({
          key: MetaplexKey.BidRedemptionTicketV2,
          data: buffer.toJSON().data,
          pubkey,
        })
  ) as BidRedemptionTicket;
}
