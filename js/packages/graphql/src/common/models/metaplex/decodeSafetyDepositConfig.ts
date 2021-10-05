import { SafetyDepositConfig } from "./entities/SafetyDepositConfig";

export function decodeSafetyDepositConfig(buffer: Buffer) {
  return new SafetyDepositConfig({
    data: buffer,
  });
}
