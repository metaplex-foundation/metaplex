import BN from "bn.js";
import { ObjectId } from "mongodb";
import { StringPublicKey } from "../../utils";
import { MetadataKey } from "../metadata/MetadataKey";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../serialize";
@Serializable()
export class Edition {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  get pubkey() {
    return this._id.toString();
  }

  @JsonProperty()
  key: MetadataKey = MetadataKey.EditionV1;

  /// Points at MasterEdition struct
  @JsonProperty()
  parent!: StringPublicKey;

  /// Starting at 0 for master record, this is incremented for each edition minted.
  @JsonProperty()
  edition!: BN;

  constructor(args?: {
    key: MetadataKey;
    parent: StringPublicKey;
    edition: BN;
  }) {
    if (args) {
      this.parent = args.parent;
      this.edition = args.edition;
    }
  }
}
