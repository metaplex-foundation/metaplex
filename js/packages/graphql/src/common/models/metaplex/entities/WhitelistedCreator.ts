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

  constructor(args?: { address: string; activated: boolean }) {
    super();

    if (args) {
      this.address = args.address;
      this.activated = args.activated;
    }
  }
}
