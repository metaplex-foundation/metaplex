import { StringPublicKey } from "../../../utils";
import { MetaplexKey } from "../MetaplexKey";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../../../api/mongo";
import { ObjectId } from "mongodb";

@Serializable()
export class WhitelistedCreator {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  get pubkey() {
    return this._id.toString();
  }

  @JsonProperty()
  key: MetaplexKey = MetaplexKey.WhitelistedCreatorV1;

  @JsonProperty()
  address!: StringPublicKey;

  @JsonProperty()
  activated: boolean = true;

  // Populated from name service
  @JsonProperty()
  twitter?: string;

  @JsonProperty()
  name?: string;

  @JsonProperty()
  image?: string;

  @JsonProperty()
  description?: string;

  constructor(args?: { address: string; activated: boolean }) {
    if (args) {
      this.address = args.address;
      this.activated = args.activated;
    }
  }
}
