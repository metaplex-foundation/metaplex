import { JsonProperty, Serializable } from "typescript-json-serializer";
import { StringPublicKey } from "../../../utils";
import { isCreatorPartOfTheStore } from "../isCreatorPartOfTheStore";
import { MetaplexKey } from "../MetaplexKey";
import { BaseEntry } from "./BaseEntry";

@Serializable()
export class WhitelistedCreator extends BaseEntry {
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

  async isCreatorPartOfTheStore(storeId: string) {
    return isCreatorPartOfTheStore(this.address, this.pubkey, storeId);
  }

  constructor(args?: { address: string; activated: boolean }) {
    super();

    if (args) {
      this.address = args.address;
      this.activated = args.activated;
    }
  }
}
