import BN from "bn.js";

export class RedeemPrintingV2BidArgs {
  instruction = 14;
  editionOffset: BN;
  winIndex: BN;
  constructor(args: { editionOffset: BN; winIndex: BN }) {
    this.editionOffset = args.editionOffset;
    this.winIndex = args.winIndex;
  }
}
