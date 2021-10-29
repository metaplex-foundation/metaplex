import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { Creator } from './Creator';

@Serializable()
export class Data {
  @JsonProperty()
  name!: string;

  @JsonProperty()
  symbol!: string;

  @JsonProperty()
  uri!: string;

  @JsonProperty()
  sellerFeeBasisPoints!: number;

  @JsonProperty()
  creators!: Creator[] | null;

  constructor(args?: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
  }) {
    if (args) {
      this.name = args.name;
      this.symbol = args.symbol;
      this.uri = args.uri;
      this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
      this.creators = args.creators;
    }
  }
}
