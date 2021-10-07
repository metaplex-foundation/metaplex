import BN from "bn.js";
import { ObjectId } from "mongodb";
import { MetadataKey } from "../metadata/MetadataKey";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { BNConverter, ObjectIdConverter } from "../../serialize";

@Serializable()
export class MasterEditionV2 {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  get pubkey() {
    return this._id.toString();
  }

  @JsonProperty()
  key: MetadataKey = MetadataKey.MasterEditionV2;

  @JsonProperty(BNConverter)
  supply!: BN;

  @JsonProperty(BNConverter)
  maxSupply?: BN;

  constructor(args?: { key: MetadataKey; supply: BN; maxSupply?: BN }) {
    if (args) {
      this.key = args.key ?? MetadataKey.MasterEditionV2;
      this.supply = args.supply;
      this.maxSupply = args.maxSupply;
    }
  }
}
