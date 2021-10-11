import { deserializeUnchecked } from 'borsh';
import { ObjectId } from 'mongodb';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { ObjectIdConverter } from './serialize';

export function decodeEntity<T>(
  type: { new (args: any): T },
  schema: Map<any, any>,
) {
  return (buffer: Buffer, pubkey: string): T => {
    const entry = deserializeUnchecked(schema, type, buffer);
    entry.pubkey = pubkey;
    return entry;
  };
}

@Serializable()
export class BaseEntity {
  @JsonProperty(ObjectIdConverter)
  _id!: ObjectId;

  get pubkey() {
    return this._id?.toString();
  }

  set pubkey(val) {
    this._id = new ObjectId(val);
  }
}
