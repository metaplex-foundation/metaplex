import BN from 'bn.js';
import { StringPublicKey } from '../../../utils';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';

@Serializable()
export class Bid {
  @JsonProperty()
  key!: StringPublicKey;

  @JsonProperty(BNConverter)
  amount!: BN;

  constructor(args?: { key: StringPublicKey; amount: BN }) {
    if (args) {
      this.key = args.key;
      this.amount = args.amount;
    }
  }
}
