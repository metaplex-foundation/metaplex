import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';

@Serializable()
export class AmountArgs {
  @JsonProperty()
  instruction: number;

  @JsonProperty()
  amount: BN;

  constructor(args: { instruction: number; amount: BN }) {
    this.instruction = args.instruction;
    this.amount = args.amount;
  }
}
