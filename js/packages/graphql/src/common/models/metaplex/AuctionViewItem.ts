import BN from 'bn.js';
import { MasterEditionV1, MasterEditionV2, Metadata } from '../metadata';
import { SafetyDepositBox } from '../vaults';
import { ParsedAccount } from '../accounts';
import { WinningConfigType } from './WinningConfigType';

export interface AuctionViewItem {
  winningConfigType: WinningConfigType;
  amount: BN;
  metadata: ParsedAccount<Metadata>;
  safetyDeposit: ParsedAccount<SafetyDepositBox>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
}
