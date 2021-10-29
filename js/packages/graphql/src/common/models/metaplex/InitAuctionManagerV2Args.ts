import BN from "bn.js";
import { TupleNumericType } from "./TupleNumericType";

export class InitAuctionManagerV2Args {
  instruction = 17;
  amountType: TupleNumericType = TupleNumericType.U8;
  lengthType: TupleNumericType = TupleNumericType.U8;
  maxRanges: BN = new BN(1);

  constructor(args: {
    amountType: TupleNumericType;
    lengthType: TupleNumericType;
    maxRanges: BN;
  }) {
    this.amountType = args.amountType;
    this.lengthType = args.lengthType;
    this.maxRanges = args.maxRanges;
  }
}
