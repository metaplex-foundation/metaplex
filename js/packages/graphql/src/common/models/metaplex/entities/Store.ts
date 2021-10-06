import { StringPublicKey } from "../../../utils";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../../../api/mongo";
import { ObjectId } from "mongodb";
import { MetaplexKey } from "../MetaplexKey";

@Serializable()
export class Store {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

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

  get pubkey() {
    return this._id?.toString();
  }

  constructor(args?: {
    public: boolean;
    auctionProgram: StringPublicKey;
    tokenVaultProgram: StringPublicKey;
    tokenMetadataProgram: StringPublicKey;
    tokenProgram: StringPublicKey;
  }) {
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
