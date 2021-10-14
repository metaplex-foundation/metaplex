import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { StringPublicKey } from '../../../utils';
import { MetaplexKey } from '../MetaplexKey';
import { BaseEntity } from '../../BaseEntity';

@Serializable()
export class WhitelistedCreator extends BaseEntity {
  @JsonProperty()
  key: MetaplexKey = MetaplexKey.WhitelistedCreatorV1;

  @JsonProperty()
  address!: StringPublicKey;

  @JsonProperty()
  activated: boolean = true;

  // Populated from name service
  @JsonProperty()
  twitter?: string;

  @JsonProperty()
  name?: string;

  @JsonProperty()
  image?: string;

  @JsonProperty()
  description?: string;

  @JsonProperty()
  storeId: StringPublicKey | undefined;

  constructor(args?: {
    _id: StringPublicKey;
    address: string;
    activated: boolean;
    twitter?: string;
    name?: string;
    image?: string;
    description?: string;
    storeId?: StringPublicKey;
  }) {
    super(args);
  }
}
