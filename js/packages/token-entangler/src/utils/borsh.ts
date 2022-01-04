import { PublicKey } from '@solana/web3.js';
import { BinaryReader, BinaryWriter } from 'borsh';
import base58 from 'bs58';
import { StringPublicKey } from './ids';

export const extendBorsh = () => {
  (BinaryReader.prototype as any).readPubkey = function () {
    const reader = this as unknown as BinaryReader;
    const array = reader.readFixedArray(32);
    return new PublicKey(array);
  };

  (BinaryWriter.prototype as any).writePubkey = function (value: PublicKey) {
    const writer = this as unknown as BinaryWriter;
    writer.writeFixedArray(value.toBuffer());
  };

  (BinaryReader.prototype as any).readPubkeyAsString = function () {
    const reader = this as unknown as BinaryReader;
    const array = reader.readFixedArray(32);
    return base58.encode(array) as StringPublicKey;
  };

  (BinaryWriter.prototype as any).writePubkeyAsString = function (
    value: StringPublicKey,
  ) {
    const writer = this as unknown as BinaryWriter;
    writer.writeFixedArray(base58.decode(value));
  };

  // BTreeMap<u32, u32>
  (BinaryReader.prototype as any).readMap32 = function () {
    const reader = this as unknown as BinaryReader;
    const map = new Map();
    const length = reader.readU32();
    for (let i = 0; i < length; i++) {
      const key = reader.readU32();
      const val = reader.readU32();
      map.set(key, val);
    }
    return map;
  };

  // BTreeMap<u32, u32>
  (BinaryWriter.prototype as any).writeMap32 = function (
    value: Map<number, number>,
  ) {
    const writer = this as unknown as BinaryWriter;
    value.forEach((val, key) => {
      writer.writeU32(key);
      writer.writeU32(val);
    });
  };
};

extendBorsh();
