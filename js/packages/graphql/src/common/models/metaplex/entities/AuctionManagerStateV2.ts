import BN from 'bn.js';
import { AuctionManagerStatus } from '../AuctionManagerStatus';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';
@Serializable()
export class AuctionManagerStateV2 {
  @JsonProperty()
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;

  @JsonProperty(BNConverter)
  safetyConfigItemsValidated: BN = new BN(0);

  @JsonProperty(BNConverter)
  bidsPushedToAcceptPayment: BN = new BN(0);

  @JsonProperty()
  hasParticipation: boolean = false;

  constructor(args?: AuctionManagerStateV2) {
    Object.assign(this, args);
  }
}
