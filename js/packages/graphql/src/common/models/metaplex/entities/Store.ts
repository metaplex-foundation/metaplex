import { JsonProperty, Serializable } from "typescript-json-serializer";
import { StringPublicKey } from "../../../utils";
import { MetaplexKey } from "../MetaplexKey";
import { BaseEntry } from "./BaseEntry";

@Serializable()
export class Store extends BaseEntry {
  @JsonProperty()
  key: MetaplexKey = MetaplexKey.StoreV1;
  @JsonProperty()
  public: boolean = true;

  @JsonProperty()
  auctionProgram!: StringPublicKey;

  @JsonProperty()
  tokenVaultProgram!: StringPublicKey;

  @JsonProperty()
  tokenMetadataProgram!: StringPublicKey;

  @JsonProperty()
  tokenProgram!: StringPublicKey;

  constructor(args?: {
    public: boolean;
    auctionProgram: StringPublicKey;
    tokenVaultProgram: StringPublicKey;
    tokenMetadataProgram: StringPublicKey;
    tokenProgram: StringPublicKey;
  }) {
    super();

    this.key = MetaplexKey.StoreV1;
    if (args) {
      this.public = args.public;
      this.auctionProgram = args.auctionProgram;
      this.tokenVaultProgram = args.tokenVaultProgram;
      this.tokenMetadataProgram = args.tokenMetadataProgram;
      this.tokenProgram = args.tokenProgram;
    }
  }
}
