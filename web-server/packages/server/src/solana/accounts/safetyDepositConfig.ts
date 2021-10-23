import { StringPublicKey } from "../ids";
import BN from 'bn.js';
import { AmountRange, MetaplexKey, TupleNumericType } from "./types";
import { AccountInfo, SystemProgram } from "@solana/web3.js";
import { NonWinningConstraint, WinningConfigType, WinningConstraint } from "./auctionManager";
import bs58 from "bs58";
import { StoreAccountDocument } from "./account";


export class ParticipationConfigV1 {
    winnerConstraint: WinningConstraint = WinningConstraint.NoParticipationPrize;
    nonWinningConstraint: NonWinningConstraint =
      NonWinningConstraint.GivenForFixedPrice;
    safetyDepositBoxIndex: number = 0;
    fixedPrice: BN | null = new BN(0);

    constructor(args?: ParticipationConfigV1) {
      Object.assign(this, args);
    }
  }

  export class ParticipationConfigV2 {
    winnerConstraint: WinningConstraint = WinningConstraint.NoParticipationPrize;
    nonWinningConstraint: NonWinningConstraint =
      NonWinningConstraint.GivenForFixedPrice;
    fixedPrice: BN | null = new BN(0);

    constructor(args?: ParticipationConfigV2) {
      Object.assign(this, args);
    }
  }

  export class ParticipationStateV2 {
    collectedToAcceptPayment: BN = new BN(0);

    constructor(args?: ParticipationStateV2) {
      Object.assign(this, args);
    }
  }

export class SafetyDepositConfig {
    key: MetaplexKey = MetaplexKey.SafetyDepositConfigV1;
    auctionManager: StringPublicKey = SystemProgram.programId.toBase58();
    order: BN = new BN(0);
    winningConfigType: WinningConfigType = WinningConfigType.PrintingV2;
    amountType: TupleNumericType = TupleNumericType.U8;
    lengthType: TupleNumericType = TupleNumericType.U8;
    amountRanges: AmountRange[] = [];
    participationConfig: ParticipationConfigV2 | null = null;
    participationState: ParticipationStateV2 | null = null;

    constructor(args: {
      data?: Uint8Array;
      directArgs?: {
        auctionManager: StringPublicKey;
        order: BN;
        winningConfigType: WinningConfigType;
        amountType: TupleNumericType;
        lengthType: TupleNumericType;
        amountRanges: AmountRange[];
        participationConfig: ParticipationConfigV2 | null;
        participationState: ParticipationStateV2 | null;
      };
    }) {
      if (args.directArgs) {
        Object.assign(this, args.directArgs);
      } else if (args.data) {
        this.auctionManager = bs58.encode(args.data.slice(1, 33));
        this.order = new BN(args.data.slice(33, 41), 'le');
        this.winningConfigType = args.data[41];
        this.amountType = args.data[42];
        this.lengthType = args.data[43];
        const lengthOfArray = new BN(args.data.slice(44, 48), 'le');
        this.amountRanges = [];
        let offset = 48;
        for (let i = 0; i < lengthOfArray.toNumber(); i++) {
          const amount = this.getBNFromData(args.data, offset, this.amountType);
          offset += this.amountType;
          const length = this.getBNFromData(args.data, offset, this.lengthType);
          offset += this.lengthType;
          this.amountRanges.push(new AmountRange({ amount, length }));
        }

        if (args.data[offset] == 0) {
          offset += 1;
          this.participationConfig = null;
        } else {
          // pick up participation config manually
          const winnerConstraintAsNumber = args.data[offset + 1];
          const nonWinnerConstraintAsNumber = args.data[offset + 2];
          let fixedPrice: BN | null = null;
          offset += 3;

          if (args.data[offset] == 1) {
            fixedPrice = new BN(args.data.slice(offset + 1, offset + 9), 'le');
            offset += 9;
          } else {
            offset += 1;
          }
          this.participationConfig = new ParticipationConfigV2({
            winnerConstraint: winnerConstraintAsNumber,
            nonWinningConstraint: nonWinnerConstraintAsNumber,
            fixedPrice: fixedPrice,
          });
        }

        if (args.data[offset] == 0) {
          offset += 1;
          this.participationState = null;
        } else {
          // pick up participation state manually
          const collectedToAcceptPayment = new BN(
            args.data.slice(offset + 1, offset + 9),
            'le',
          );
          offset += 9;
          this.participationState = new ParticipationStateV2({
            collectedToAcceptPayment,
          });
        }
      }
    }

    getBNFromData(
      data: Uint8Array,
      offset: number,
      dataType: TupleNumericType,
    ): BN {
      switch (dataType) {
        case TupleNumericType.U8:
          return new BN(data[offset], 'le');
        case TupleNumericType.U16:
          return new BN(data.slice(offset, offset + 2), 'le');
        case TupleNumericType.U32:
          return new BN(data.slice(offset, offset + 4), 'le');
        case TupleNumericType.U64:
          return new BN(data.slice(offset, offset + 8), 'le');
      }
    }

    getAmountForWinner(winner: BN): BN {
      let start = new BN(0);
      for (let i = 0; i < this.amountRanges.length; i++) {
        const end = start.add(this.amountRanges[i].length);
        if (winner.gte(start) && winner.lt(end)) {
          return this.amountRanges[i].amount;
        }
        start = end;
      }
      return new BN(0);
    }
  }

  export const decodeSafetyDepositConfig = (buffer: Buffer) => {
    return new SafetyDepositConfig({
      data: buffer,
    });
  };

  export class SafetyDepositConfigAccountDocument extends StoreAccountDocument
  {
    auctionManager : string;
    order : BN;
    constructor(store: string, pubkey : string, account : AccountInfo<Buffer>, auctionManager : string, order : BN) {
      super(store, pubkey, account);
      this.auctionManager = auctionManager;
      this.order = order;
    }
  }