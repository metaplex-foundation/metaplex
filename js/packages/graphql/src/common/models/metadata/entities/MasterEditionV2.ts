import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { BNConverter } from '../../serialize';
import { MetadataKey } from '../MetadataKey';

@Serializable()
export class MasterEditionV2 extends BaseEntity {
  @JsonProperty()
  key: MetadataKey = MetadataKey.MasterEditionV2;

  @JsonProperty(BNConverter)
  supply!: BN;

  @JsonProperty(BNConverter)
  maxSupply?: BN;

  constructor(args?: { key: MetadataKey; supply: BN; maxSupply?: BN }) {
    super();

    if (args) {
      this.key = args.key ?? MetadataKey.MasterEditionV2;
      this.supply = args.supply;
      this.maxSupply = args.maxSupply;
    }
  }
}
