import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';

@Serializable()
export class AmountRange {
  @JsonProperty(BNConverter)
  amount!: BN;
  @JsonProperty(BNConverter)
  length!: BN;

  constructor(args?: { amount: BN; length: BN }) {
    if (args) {
      this.amount = args.amount;
      this.length = args.length;
    }
  }
}
