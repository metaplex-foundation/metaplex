import { PublicKey } from '@solana/web3.js';
import {
  deserializeUnchecked,
  serialize,
  deserialize,
  BinaryReader,
  BinaryWriter,
  Schema,
} from 'borsh';
import base58 from 'bs58';

type BinaryReaderExtended = BinaryReader & {
  readPubkey(): PublicKey;
  readPubkeyAsString(): string;
};

type BinaryWriterExtended = BinaryWriter & {
  writePubkey(value: PublicKey): void;
  writePubkeyAsString(value: string): void;
};
export const extendBorsh = () => {
  (BinaryReader.prototype as BinaryReaderExtended).readPubkey = function (
    this: BinaryReaderExtended,
  ) {
    const array = this.readFixedArray(32);
    return new PublicKey(array);
  };
  (BinaryWriter.prototype as BinaryWriterExtended).writePubkey = function (
    this: BinaryWriterExtended,
    value: PublicKey,
  ) {
    this.writeFixedArray(value.toBuffer());
  };
  (BinaryReader.prototype as BinaryReaderExtended).readPubkeyAsString = function (
    this: BinaryReaderExtended,
  ) {
    const array = this.readFixedArray(32);
    return base58.encode(array); // pubkey string
  };
  (BinaryWriter.prototype as BinaryWriterExtended).writePubkeyAsString = function (
    this: BinaryWriterExtended,
    value: string, // pubkey string
  ) {
    this.writeFixedArray(base58.decode(value));
  };
};

extendBorsh();

/* eslint-disable @typescript-eslint/no-explicit-any */
type DataConstructor<T, A> = {
  readonly SCHEMA: Schema;
  new (args: A): T;
};

export class Data<T = {}> {
  constructor(args: T = {} as T) {
    Object.assign(this, args);
  }

  static struct<T, A>(this: DataConstructor<T, A>, fields: any) {
    return struct(this, fields);
  }

  static serialize<T, A>(this: DataConstructor<T, A>, args: A = {} as A) {
    return Buffer.from(serialize(this.SCHEMA, new this(args)));
  }

  static deserialize<T, A>(this: DataConstructor<T, A>, data: Buffer) {
    return deserializeUnchecked(this.SCHEMA, this, data);
  }
}

export const struct = (type: any, fields: any) => {
  return new Map<any, any>([[type, { kind: 'struct', fields }]]);
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export { deserialize, deserializeUnchecked, serialize };
