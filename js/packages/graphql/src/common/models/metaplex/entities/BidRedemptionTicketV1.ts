import { MetaplexKey } from '../MetaplexKey';
import { BidRedemptionTicket } from '../BidRedemptionTicket';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
@Serializable()
export class BidRedemptionTicketV1
  extends BaseEntity
  implements BidRedemptionTicket
{
  @JsonProperty()
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV1;

  @JsonProperty()
  participationRedeemed: boolean = false;

  @JsonProperty()
  itemsRedeemed: number = 0;

  constructor(args?: BidRedemptionTicketV1) {
    super();

    Object.assign(this, args);
  }

  getBidRedeemed(): boolean {
    return this.participationRedeemed;
  }
}
