import { ObjectId } from "mongodb";
import { PublicKey } from "@solana/web3.js";
import { StringPublicKey, toPublicKey, programIds } from "../../utils";
import { Data } from "./Data";
import { getEdition } from "../metadata/getEdition";
import { MetadataKey } from "../metadata/MetadataKey";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../../api/mongo";
import { METADATA_PREFIX } from "../../actions/metadata/constants";
@Serializable()
export class Metadata {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  get pubkey() {
    return this._id.toString();
  }

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
    const metadata = toPublicKey(programIds().metadata);
    if (this.editionNonce !== null) {
      this.edition = (
        await PublicKey.createProgramAddress(
          [
            Buffer.from(METADATA_PREFIX),
            metadata.toBuffer(),
            toPublicKey(this.mint).toBuffer(),
            new Uint8Array([this.editionNonce || 0]),
          ],
          metadata
        )
      ).toBase58();
    } else {
      this.edition = await getEdition(this.mint);
    }
    this.masterEdition = this.edition;
  }
}
