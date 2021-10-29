import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { BNConverter } from '../../serialize';
@Serializable()
export class AuctionDataExtended extends BaseEntity {
  @JsonProperty()
  /// Total uncancelled bids
  totalUncancelledBids!: BN;

  @JsonProperty(BNConverter)
  tickSize!: BN | null;

  @JsonProperty()
  gapTickSizePercentage!: number | null;

  constructor(args?: {
    totalUncancelledBids: BN;
    tickSize: BN | null;
    gapTickSizePercentage: number | null;
  }) {
    super();

    if (args) {
      this.totalUncancelledBids = args.totalUncancelledBids;
      this.tickSize = args.tickSize;
      this.gapTickSizePercentage = args.gapTickSizePercentage;
    }
  }
}
