import { deserializeUnchecked } from "borsh";
import { ObjectId } from "mongodb";
import { JsonProperty, Serializable } from "typescript-json-serializer";
import { ObjectIdConverter } from "../../../../api/mongo";
import { StringPublicKey } from "../../../utils";
import { SCHEMA } from "../schema";

export function decodeEntry<T>(type: { new (args: any): T }) {
  return (buffer: Buffer, pubkey?: string): T => {
    const entry = deserializeUnchecked(SCHEMA, type, buffer);
    entry.pubkey = pubkey;
    return entry;
  };
}

@Serializable()
export class BaseEntry {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  @JsonProperty()
  pubkey!: StringPublicKey;
}
