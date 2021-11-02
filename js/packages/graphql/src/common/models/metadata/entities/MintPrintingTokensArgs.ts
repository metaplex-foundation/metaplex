import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';
@Serializable()
export class MintPrintingTokensArgs {
  @JsonProperty()
  instruction: number = 9;

  @JsonProperty(BNConverter)
  supply!: BN;

  constructor(args?: { supply: BN }) {
    if (args) {
      this.supply = args.supply;
    }
  }
}
