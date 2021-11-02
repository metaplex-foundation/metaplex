import BN from 'bn.js';
import { StringPublicKey } from '../../../utils';
import { BidStateType } from '../enums';
import { Bid } from './Bid';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';

@Serializable()
export class BidState {
  @JsonProperty()
  type!: BidStateType;

  @JsonProperty()
  bids!: Bid[];

  @JsonProperty(BNConverter)
  max!: BN;

  public getWinnerAt(winnerIndex: number): StringPublicKey | null {
    const convertedIndex = this.bids.length - winnerIndex - 1;

    if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
      return this.bids[convertedIndex].key;
    } else {
      return null;
    }
  }

  public getAmountAt(winnerIndex: number): BN | null {
    const convertedIndex = this.bids.length - winnerIndex - 1;

    if (convertedIndex >= 0 && convertedIndex < this.bids.length) {
      return this.bids[convertedIndex].amount;
    } else {
      return null;
    }
  }

  public getWinnerIndex(bidder: StringPublicKey): number | null {
    if (!this.bids) return null;

    const index = this.bids.findIndex(b => b.key === bidder);
    // auction stores data in reverse order
    if (index !== -1) {
      const zeroBased = this.bids.length - index - 1;
      return zeroBased < this.max.toNumber() ? zeroBased : null;
    } else return null;
  }

  constructor(args?: { type: BidStateType; bids: Bid[]; max: BN }) {
    if (args) {
      this.type = args.type;
      this.bids = args.bids;
      this.max = args.max;
    }
  }
}
