import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { StringPublicKey } from '../../../utils';

@Serializable()
export class Creator {
  @JsonProperty()
  address!: StringPublicKey;

  @JsonProperty()
  verified!: boolean;

  @JsonProperty()
  share!: number;

  constructor(args?: {
    address: StringPublicKey;
    verified: boolean;
    share: number;
  }) {
    if (args) {
      this.address = args.address;
      this.verified = args.verified;
      this.share = args.share;
    }
  }
}
