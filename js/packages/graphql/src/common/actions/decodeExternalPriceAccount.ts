import { deserializeUnchecked } from "borsh";
import { ExternalPriceAccount } from "./ExternalPriceAccount";
import { VAULT_SCHEMA } from "./schemas";

export function decodeExternalPriceAccount(buffer: Buffer) {
  return deserializeUnchecked(
    VAULT_SCHEMA,
    ExternalPriceAccount,
    buffer
  ) as ExternalPriceAccount;
}
