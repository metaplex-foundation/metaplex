import { JsonProperty, Serializable } from 'typescript-json-serializer';

@Serializable()
export class InitVaultArgs {
  @JsonProperty()
  instruction: number = 0;

  @JsonProperty()
  allowFurtherShareCreation: boolean = false;

  constructor(args: { allowFurtherShareCreation: boolean }) {
    this.allowFurtherShareCreation = args.allowFurtherShareCreation;
  }
}
