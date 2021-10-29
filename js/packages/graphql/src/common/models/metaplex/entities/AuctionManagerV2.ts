import { StringPublicKey } from '../../../utils';
import { MetaplexKey } from '../MetaplexKey';
import { AuctionManagerStateV2 } from './AuctionManagerStateV2';

import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
@Serializable()
export class AuctionManagerV2 extends BaseEntity {
  @JsonProperty()
  key!: MetaplexKey;

  @JsonProperty()
  store!: StringPublicKey;

  @JsonProperty()
  authority!: StringPublicKey;

  @JsonProperty()
  auction!: StringPublicKey;

  @JsonProperty()
  vault!: StringPublicKey;

  @JsonProperty()
  acceptPayment!: StringPublicKey;

  @JsonProperty()
  state!: AuctionManagerStateV2;

  constructor(args?: {
    store: StringPublicKey;
    authority: StringPublicKey;
    auction: StringPublicKey;
    vault: StringPublicKey;
    acceptPayment: StringPublicKey;
    state: AuctionManagerStateV2;
  }) {
    super();

    this.key = MetaplexKey.AuctionManagerV2;
    if (args) {
      this.store = args.store;
      this.authority = args.authority;
      this.auction = args.auction;
      this.vault = args.vault;
      this.acceptPayment = args.acceptPayment;
      this.state = args.state;
    }
  }
}
