import { scalarType } from "nexus";
import BN from "bn.js";

export const PublicKeyScalar = scalarType({
  name: "PublicKey",
  asNexusMethod: "pubkey",
  // parseValue(value: string) {
  //   return new PublicKey(value);
  // },
  // serialize(value: PublicKey) {
  //   return value.toBase58();
  // },
  parseValue(value: string) {
    return value;
  },
  serialize(value: string) {
    return value;
  },
});

export const BNScalar = scalarType({
  name: "BN",
  asNexusMethod: "bn",
  description: "GraphQL representation of BigNumber",
  parseValue(value: string) {
    return new BN(value, 10);
  },
  serialize(value: BN) {
    return value ? value.toString(10) : null;
  },
});

export const BufferScalar = scalarType({
  name: "Buffer",
  asNexusMethod: "buffer",
  parseValue(value: string) {
    return Buffer.from(value, "base64");
  },
  serialize(value: Buffer) {
    return value.toString("base64");
  },
});

export const Uint8ArrayScalar = scalarType({
  name: "Uint8Array",
  asNexusMethod: "uint8",
  parseValue(value: string) {
    return new TextEncoder().encode(value);
  },
  serialize(value: Uint8Array) {
    return new TextDecoder().decode(value);
  },
});
