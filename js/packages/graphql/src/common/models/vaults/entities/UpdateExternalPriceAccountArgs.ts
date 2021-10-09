import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { ExternalPriceAccount } from './ExternalPriceAccount';

@Serializable()
export class UpdateExternalPriceAccountArgs {
  @JsonProperty()
  instruction: number = 9;

  @JsonProperty()
  externalPriceAccount: ExternalPriceAccount;

  constructor(args: { externalPriceAccount: ExternalPriceAccount }) {
    this.externalPriceAccount = args.externalPriceAccount;
  }
}
