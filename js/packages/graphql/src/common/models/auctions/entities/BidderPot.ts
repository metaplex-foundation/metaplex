import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { StringPublicKey } from '../../../utils';

@Serializable()
export class BidderPot extends BaseEntity {
  /// Points at actual pot that is a token account
  @JsonProperty()
  bidderPot!: StringPublicKey;

  @JsonProperty()
  bidderAct!: StringPublicKey;

  @JsonProperty()
  auctionAct!: StringPublicKey;

  @JsonProperty()
  emptied!: boolean;

  constructor(args?: {
    bidderPot: StringPublicKey;
    bidderAct: StringPublicKey;
    auctionAct: StringPublicKey;
    emptied: boolean;
  }) {
    super();

    if (args) {
      this.bidderPot = args.bidderPot;
      this.bidderAct = args.bidderAct;
      this.auctionAct = args.auctionAct;
      this.emptied = args.emptied;
    }
  }
}
