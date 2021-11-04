import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';

@Serializable()
export class ParticipationStateV2 {
  @JsonProperty(BNConverter)
  collectedToAcceptPayment: BN = new BN(0);

  constructor(args?: ParticipationStateV2) {
    Object.assign(this, args);
  }
}
