import BN from "bn.js";

export class u64 extends BN {
  toBuffer(): Buffer;
  static fromBuffer(buffer: Buffer): u64;
}
