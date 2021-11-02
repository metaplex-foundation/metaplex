import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { StringPublicKey } from '../../../utils';
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

  constructor(args?: { _id?: StringPublicKey; supply: BN; maxSupply?: BN }) {
    super(args);
  }
}
