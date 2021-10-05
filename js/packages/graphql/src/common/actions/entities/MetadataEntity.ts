import { ObjectId } from "mongodb";
import { StringPublicKey } from "../../utils";
import { Data } from "./Data";
import { getEdition } from "../metadata/getEdition";
import { MetadataKey } from "../metadata/MetadataKey";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../../api/mongo";
@Serializable()
export class Metadata {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  @JsonProperty()
  key: MetadataKey = MetadataKey.MetadataV1;

  @JsonProperty()
  updateAuthority!: StringPublicKey;

  @JsonProperty()
  mint!: StringPublicKey;

  @JsonProperty()
  data!: Data;

  @JsonProperty()
  primarySaleHappened!: boolean;

  @JsonProperty()
  isMutable!: boolean;

  @JsonProperty()
  editionNonce!: number | null;

  // set lazy
  @JsonProperty()
  masterEdition?: StringPublicKey;

  @JsonProperty()
  edition?: StringPublicKey;

  constructor(args?: {
    updateAuthority: StringPublicKey;
    mint: StringPublicKey;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    editionNonce: number | null;
  }) {
    if (args) {
      this.updateAuthority = args.updateAuthority;
      this.mint = args.mint;
      this.data = args.data;
      this.primarySaleHappened = args.primarySaleHappened;
      this.isMutable = args.isMutable;
      this.editionNonce = args.editionNonce;
    }
  }

  public async init() {
    const edition = await getEdition(this.mint);
    this.edition = edition;
    this.masterEdition = edition;
  }
}
