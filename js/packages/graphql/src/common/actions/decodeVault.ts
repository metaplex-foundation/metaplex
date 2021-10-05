import { deserializeUnchecked } from "borsh";
import { Vault } from "./entities/index";
import { VAULT_SCHEMA } from "./schemas";

export function decodeVault(buffer: Buffer) {
  return deserializeUnchecked(VAULT_SCHEMA, Vault, buffer) as Vault;
}
