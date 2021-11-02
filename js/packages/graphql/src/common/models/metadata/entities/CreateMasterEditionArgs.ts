import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';
import BN from 'bn.js';

@Serializable()
export class CreateMasterEditionArgs {
  @JsonProperty()
  instruction: number = 10;

  @JsonProperty(BNConverter)
  maxSupply: BN | null = null;
  constructor(args?: { maxSupply: BN | null }) {
    if (args) {
      this.maxSupply = args.maxSupply;
    }
  }
}
