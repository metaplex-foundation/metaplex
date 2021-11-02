import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { Data } from './Data';

@Serializable()
export class CreateMetadataArgs {
  @JsonProperty()
  instruction: number = 0;

  @JsonProperty()
  data!: Data;

  @JsonProperty()
  isMutable!: boolean;

  constructor(args?: { data: Data; isMutable: boolean }) {
    if (args) {
      this.data = args.data;
      this.isMutable = args.isMutable;
    }
  }
}
