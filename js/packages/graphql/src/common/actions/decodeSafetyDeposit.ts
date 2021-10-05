import { deserializeUnchecked } from "borsh";
import { SafetyDepositBox } from "./entities/index";
import { VAULT_SCHEMA } from "./schemas";

export function decodeSafetyDeposit(buffer: Buffer) {
  return deserializeUnchecked(
    VAULT_SCHEMA,
    SafetyDepositBox,
    buffer
  ) as SafetyDepositBox;
}
