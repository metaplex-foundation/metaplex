import { SafetyDepositConfig } from '../entities';

export function decodeSafetyDepositConfig(buffer: Buffer, pubkey?: string) {
  return new SafetyDepositConfig({
    data: buffer,
    pubkey,
  });
}
