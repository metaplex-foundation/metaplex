import { ExternalPriceAccount } from "./ExternalPriceAccount";

export class UpdateExternalPriceAccountArgs {
  instruction: number = 9;
  externalPriceAccount: ExternalPriceAccount;

  constructor(args: { externalPriceAccount: ExternalPriceAccount }) {
    this.externalPriceAccount = args.externalPriceAccount;
  }
}
