import { deserializeUnchecked } from 'borsh';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { StringPublicKey } from '../utils/ids';

export function decodeEntity<T>(
  type: { new (args: any): T },
  schema: Map<any, any>,
) {
  return (buffer: Buffer, pubkey?: string): T => {
    const entry = deserializeUnchecked(schema, type, buffer);
    if (pubkey) {
      entry.pubkey = pubkey;
    }
    return entry;
  };
}

@Serializable()
export class BaseEntity {
  @JsonProperty()
  _id!: StringPublicKey;

  constructor(args?: any) {
    if (typeof args === 'object') {
      Object.assign(this, args);
    }
  }

  get pubkey() {
    return this._id;
  }

  set pubkey(val) {
    this._id = val;
  }
}
