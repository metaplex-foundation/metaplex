import { SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import bs58 from 'bs58';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';
import { StringPublicKey } from '../../../utils';
import { MetaplexKey } from '../MetaplexKey';
import { TupleNumericType } from '../TupleNumericType';
import { WinningConfigType } from '../WinningConfigType';
import { AmountRange } from './AmountRange';
import { BaseEntity } from '../../BaseEntity';
import { ParticipationConfigV2 } from './ParticipationConfigV2';
import { ParticipationStateV2 } from './ParticipationStateV2';

@Serializable()
export class SafetyDepositConfig extends BaseEntity {
  @JsonProperty()
  key: MetaplexKey = MetaplexKey.SafetyDepositConfigV1;

  @JsonProperty()
  auctionManager: StringPublicKey = SystemProgram.programId.toBase58();

  @JsonProperty(BNConverter)
  order: BN = new BN(0);

  @JsonProperty()
  winningConfigType: WinningConfigType = WinningConfigType.PrintingV2;

  @JsonProperty()
  amountType: TupleNumericType = TupleNumericType.U8;

  @JsonProperty()
  lengthType: TupleNumericType = TupleNumericType.U8;

  @JsonProperty()
  amountRanges: AmountRange[] = [];

  @JsonProperty()
  participationConfig: ParticipationConfigV2 | null = null;

  @JsonProperty()
  participationState: ParticipationStateV2 | null = null;

  constructor(args?: {
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
    pubkey?: string;
  }) {
    super();

    if (args) {
      this.pubkey = args.pubkey ?? '';
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
