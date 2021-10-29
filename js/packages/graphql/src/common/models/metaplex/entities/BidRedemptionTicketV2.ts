import BN from 'bn.js';
import bs58 from 'bs58';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';
import { StringPublicKey } from '../../../utils';
import { BidRedemptionTicket } from '../BidRedemptionTicket';
import { MetaplexKey } from '../MetaplexKey';
import { BaseEntity } from '../../BaseEntity';

@Serializable()
export class BidRedemptionTicketV2
  extends BaseEntity
  implements BidRedemptionTicket
{
  @JsonProperty()
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV2;

  @JsonProperty(BNConverter)
  winnerIndex!: BN | null;

  @JsonProperty()
  auctionManager!: StringPublicKey;

  @JsonProperty()
  data: number[] = [];

  constructor(args?: { key: MetaplexKey; data: number[]; pubkey?: string }) {
    super();

    if (args) {
      Object.assign(this, args);
      let offset = 2;
      if (this.data[1] == 0) {
        this.winnerIndex = null;
      } else {
        this.winnerIndex = new BN(this.data.slice(1, 9), 'le');
        offset += 8;
      }

      this.auctionManager = bs58.encode(this.data.slice(offset, offset + 32));
    }
  }

  getBidRedeemed(order: number): boolean {
    let offset = 42;
    if (this.data[1] == 0) {
      offset -= 8;
    }
    const index = Math.floor(order / 8) + offset;
    const positionFromRight = 7 - (order % 8);
    const mask = Math.pow(2, positionFromRight);

    const appliedMask = this.data[index] & mask;

    return appliedMask != 0;
  }
}
