import { MetaplexKey } from '../MetaplexKey';
import { AuctionManagerSettingsV1 } from './AuctionManagerSettingsV1';
import { AuctionManagerStateV1 } from './AuctionManagerStateV1';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
@Serializable()
export class AuctionManagerV1 extends BaseEntity {
  @JsonProperty()
  key!: MetaplexKey;

  @JsonProperty()
  store!: string;

  @JsonProperty()
  authority!: string;

  @JsonProperty()
  auction!: string;

  @JsonProperty()
  vault!: string;

  @JsonProperty()
  acceptPayment!: string;

  @JsonProperty()
  state!: AuctionManagerStateV1;

  @JsonProperty()
  settings!: AuctionManagerSettingsV1;

  constructor(args?: {
    store: string;
    authority: string;
    auction: string;
    vault: string;
    acceptPayment: string;
    state: AuctionManagerStateV1;
    settings: AuctionManagerSettingsV1;
  }) {
    super();

    this.key = MetaplexKey.AuctionManagerV1;
    if (args) {
      this.store = args.store;
      this.authority = args.authority;
      this.auction = args.auction;
      this.vault = args.vault;
      this.acceptPayment = args.acceptPayment;
      this.state = args.state;
      this.settings = args.settings;
    }
  }
}
