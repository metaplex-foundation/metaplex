import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';

@Serializable()
export class NumberOfShareArgs {
  @JsonProperty()
  instruction: number;

  @JsonProperty()
  numberOfShares: BN;

  constructor(args: { instruction: number; numberOfShares: BN }) {
    this.instruction = args.instruction;
    this.numberOfShares = args.numberOfShares;
  }
}
