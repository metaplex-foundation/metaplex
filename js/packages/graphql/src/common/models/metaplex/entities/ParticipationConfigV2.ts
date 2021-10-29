import BN from 'bn.js';
import { NonWinningConstraint } from '../NonWinningConstraint';
import { WinningConstraint } from '../WinningConstraint';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BNConverter } from '../../serialize';

@Serializable()
export class ParticipationConfigV2 {
  @JsonProperty()
  winnerConstraint: WinningConstraint = WinningConstraint.NoParticipationPrize;

  @JsonProperty()
  nonWinningConstraint: NonWinningConstraint =
    NonWinningConstraint.GivenForFixedPrice;

  @JsonProperty(BNConverter)
  fixedPrice: BN | null = new BN(0);

  constructor(args?: ParticipationConfigV2) {
    Object.assign(this, args);
  }
}
