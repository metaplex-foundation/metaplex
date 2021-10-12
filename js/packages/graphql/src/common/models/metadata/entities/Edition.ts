import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { StringPublicKey } from '../../../utils';
import { MetadataKey } from '../MetadataKey';
@Serializable()
export class Edition extends BaseEntity {
  @JsonProperty()
  key: MetadataKey = MetadataKey.EditionV1;

  /// Points at MasterEdition struct
  @JsonProperty()
  parent!: StringPublicKey;

  /// Starting at 0 for master record, this is incremented for each edition minted.
  @JsonProperty()
  edition!: BN;

  constructor(args?: {
    _id?: StringPublicKey;
    key: MetadataKey;
    parent: StringPublicKey;
    edition: BN;
  }) {
    super(args);
    this.key = args?.key ?? this.key;
  }
}
