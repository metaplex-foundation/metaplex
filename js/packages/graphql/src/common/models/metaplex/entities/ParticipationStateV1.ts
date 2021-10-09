import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';
@Serializable()
export class ParticipationStateV1 {
  @JsonProperty(BNConverter)
  collectedToAcceptPayment: BN = new BN(0);

  @JsonProperty()
  primarySaleHappened: boolean = false;

  @JsonProperty()
  validated: boolean = false;

  @JsonProperty()
  printingAuthorizationTokenAccount: string | null = null;

  constructor(args?: ParticipationStateV1) {
    Object.assign(this, args);
  }
}
