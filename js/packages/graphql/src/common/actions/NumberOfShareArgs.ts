import BN from "bn.js";

export class NumberOfShareArgs {
  instruction: number;
  numberOfShares: BN;

  constructor(args: { instruction: number; numberOfShares: BN }) {
    this.instruction = args.instruction;
    this.numberOfShares = args.numberOfShares;
  }
}
