import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { PriceFloorType } from '../enums';

@Serializable()
export class PriceFloor {
  @JsonProperty()
  type!: PriceFloorType;

  // It's an array of 32 u8s, when minimum, only first 8 are used (a u64), when blinded price, the entire
  // thing is a hash and not actually a public key, and none is all zeroes
  @JsonProperty()
  hash!: Uint8Array;

  @JsonProperty()
  minPrice?: BN;

  constructor(args?: {
    type: PriceFloorType;
    hash?: Uint8Array;
    minPrice?: BN;
  }) {
    if (args) {
      this.type = args.type;
      this.hash = args.hash || new Uint8Array(32);
      if (this.type === PriceFloorType.Minimum) {
        if (args.minPrice) {
          this.hash.set(args.minPrice.toArrayLike(Buffer, 'le', 8), 0);
        } else {
          this.minPrice = new BN(
            (args.hash || new Uint8Array(0)).slice(0, 8),
            'le',
          );
        }
      }
    }
  }
}
