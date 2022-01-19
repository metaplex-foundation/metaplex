import BN from 'bn.js';
import { PackDistributionType } from '../models/packs/types';
import {
  AddCardToPackParams,
  InitPackSetParams,
  RequestCardToRedeemParams,
  ClaimPackParams,
} from '../models/packs/interface';

export class InitPackSetArgs {
  instruction = 0;
  name: Uint8Array;
  description: string;
  uri: string;
  mutable: boolean;
  distributionType: PackDistributionType;
  allowedAmountToRedeem: BN;
  redeemStartDate: BN | null;
  redeemEndDate: BN | null;

  constructor(args: InitPackSetParams) {
    this.name = args.name;
    this.description = args.description;
    this.uri = args.uri;
    this.mutable = args.mutable;
    this.distributionType = args.distributionType;
    this.allowedAmountToRedeem = args.allowedAmountToRedeem;
    this.redeemStartDate = args.redeemStartDate;
    this.redeemEndDate = args.redeemEndDate;
  }
}

export class AddCardToPackArgs {
  instruction = 1;
  maxSupply: BN | null;
  weight: BN | null;
  index: number;

  constructor(args: AddCardToPackParams) {
    this.maxSupply = args.maxSupply;
    this.weight = args.weight;
    this.index = args.index;
  }
}

export class AddVoucherToPackArgs {
  instruction = 2;

  constructor() {}
}

export class ActivatePackArgs {
  instruction = 3;

  constructor() {}
}

export class ClaimPackArgs {
  instruction = 6;
  index: number;

  constructor(args: ClaimPackParams) {
    this.index = args.index;
  }
}

export class RequestCardToRedeemArgs {
  instruction = 12;
  index: number;

  constructor(args: RequestCardToRedeemParams) {
    this.index = args.index;
  }
}

export class CleanUpArgs {
  instruction = 13;

  constructor() {}
}

export const PACKS_SCHEMA = new Map<any, any>([
  [
    InitPackSetArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['name', [32]],
        ['description', 'string'],
        ['uri', 'string'],
        ['mutable', 'u8'],
        ['distributionType', 'u8'],
        ['allowedAmountToRedeem', 'u32'],
        ['redeemStartDate', { kind: 'option', type: 'u64' }],
        ['redeemEndDate', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
  [
    AddCardToPackArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['maxSupply', 'u32'],
        ['weight', 'u16'],
        ['index', 'u32'],
      ],
    },
  ],
  [
    AddVoucherToPackArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    ActivatePackArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    ClaimPackArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['index', 'u32'],
      ],
    },
  ],
  [
    RequestCardToRedeemArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['index', 'u32'],
      ],
    },
  ],
  [
    CleanUpArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
]);
