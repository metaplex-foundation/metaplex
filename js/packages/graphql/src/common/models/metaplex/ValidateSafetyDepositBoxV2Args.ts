import { SafetyDepositConfig } from "./entities/SafetyDepositConfig";

export class ValidateSafetyDepositBoxV2Args {
  instruction = 18;
  safetyDepositConfig: SafetyDepositConfig;
  constructor(safetyDeposit: SafetyDepositConfig) {
    this.safetyDepositConfig = safetyDeposit;
  }
}
