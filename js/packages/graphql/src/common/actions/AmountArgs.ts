import BN from "bn.js";

export class AmountArgs {
  instruction: number;
  amount: BN;

  constructor(args: { instruction: number; amount: BN }) {
    this.instruction = args.instruction;
    this.amount = args.amount;
  }
}
