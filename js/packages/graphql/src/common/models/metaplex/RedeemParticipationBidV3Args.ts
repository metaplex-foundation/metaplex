import BN from "bn.js";

export class RedeemParticipationBidV3Args {
  instruction = 19;
  winIndex: BN | null;
  constructor(args: { winIndex: BN | null }) {
    this.winIndex = args.winIndex;
  }
}
