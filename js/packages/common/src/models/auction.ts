import {
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
} from '../actions/metadata';
import { ParsedAccount } from '../contexts/accounts/types';
import { StringPublicKey } from '../utils/ids';
import {
  AmountRange,
  ParticipationConfigV2,
  WinningConfigType,
} from './metaplex';

export interface SafetyDepositDraft {
  metadata: ParsedAccount<Metadata>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
  edition?: ParsedAccount<Edition>;
  holding: StringPublicKey;
  printingMintHolding?: StringPublicKey;
  winningConfigType: WinningConfigType;
  amountRanges: AmountRange[];
  participationConfig?: ParticipationConfigV2;
}
