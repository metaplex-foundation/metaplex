import { StringPublicKey } from '../../../utils';
import { Data } from './Data';
import { JsonProperty, Serializable } from 'typescript-json-serializer';

@Serializable()
export class UpdateMetadataArgs {
  @JsonProperty()
  instruction: number = 1;

  @JsonProperty()
  data!: Data | null;
  // Not used by this app, just required for instruction
  @JsonProperty()
  updateAuthority!: StringPublicKey | null;

  @JsonProperty()
  primarySaleHappened!: boolean | null;

  constructor(args?: {
    data?: Data;
    updateAuthority?: string;
    primarySaleHappened: boolean | null;
  }) {
    if (args) {
      this.data = args.data ? args.data : null;
      this.updateAuthority = args.updateAuthority ? args.updateAuthority : null;
      this.primarySaleHappened = args.primarySaleHappened;
    }
  }
}
