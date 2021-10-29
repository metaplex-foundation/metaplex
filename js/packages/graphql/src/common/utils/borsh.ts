import { PublicKey } from "@solana/web3.js";
import { BinaryReader, BinaryWriter } from "borsh";
import base58 from "bs58";
import { StringPublicKey } from "./ids";

export const extendBorsh = () => {
  Object.assign(BinaryReader.prototype, {
    readPubkey(this: BinaryReader) {
      const array = this.readFixedArray(32);
      return new PublicKey(array);
    },
    writePubkey(this: BinaryWriter, value: PublicKey) {
      this.writeFixedArray(value.toBuffer());
    },
    readPubkeyAsString(this: BinaryReader) {
      const array = this.readFixedArray(32);
      return base58.encode(array) as StringPublicKey;
    },
    writePubkeyAsString(this: BinaryWriter, value: StringPublicKey) {
      this.writeFixedArray(base58.decode(value));
    },
  });
};
