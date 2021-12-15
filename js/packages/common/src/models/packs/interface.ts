import BN from 'bn.js';
import { PackDistributionType } from './types';

export interface InitPackSetParams {
  name: Uint8Array;
  description: string;
  uri: string;
  mutable: boolean;
  distributionType: PackDistributionType;
  allowedAmountToRedeem: BN;
  redeemStartDate: BN | null;
  redeemEndDate: BN | null;
}

export interface AddCardToPackParams {
  maxSupply: BN | null;
  weight: BN | null;
  index: number;
}

export interface RequestCardToRedeemParams {
  index: number;
}

export interface ClaimPackParams {
  index: number;
}
