import { programIds, findProgramAddress } from '@oyster/common';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  AuctionManagerStatus,
  BidRedemptionTicket,
  MetaplexKey,
  METAPLEX_PREFIX,
  NonWinningConstraint,
  WinningConfigType,
  WinningConstraint,
} from '.';

export const MAX_BID_REDEMPTION_TICKET_V1_SIZE = 3;

export class AuctionManagerV1 {
  key: MetaplexKey;
  store: PublicKey;
  authority: PublicKey;
  auction: PublicKey;
  vault: PublicKey;
  acceptPayment: PublicKey;
  state: AuctionManagerStateV1;
  settings: AuctionManagerSettingsV1;

  constructor(args: {
    store: PublicKey;
    authority: PublicKey;
    auction: PublicKey;
    vault: PublicKey;
    acceptPayment: PublicKey;
    state: AuctionManagerStateV1;
    settings: AuctionManagerSettingsV1;
  }) {
    this.key = MetaplexKey.AuctionManagerV1;
    this.store = args.store;
    this.authority = args.authority;
    this.auction = args.auction;
    this.vault = args.vault;
    this.acceptPayment = args.acceptPayment;
    this.state = args.state;
    this.settings = args.settings;
  }
}

export class DeprecatedInitAuctionManagerV1Args {
  instruction = 0;
  settings: AuctionManagerSettingsV1;

  constructor(args: { settings: AuctionManagerSettingsV1 }) {
    this.settings = args.settings;
  }
}

export class DeprecatedValidateSafetyDepositBoxV1Args {
  instruction = 1;
}

export class DeprecatedRedeemParticipationBidArgs {
  instruction = 4;
}

export class DeprecatedPopulateParticipationPrintingAccountArgs {
  instruction = 11;
}

export class DeprecatedValidateParticipationArgs {
  instruction = 10;
}

export class AuctionManagerSettingsV1 {
  winningConfigs: WinningConfig[] = [];
  participationConfig: ParticipationConfigV1 | null = null;

  constructor(args?: AuctionManagerSettingsV1) {
    Object.assign(this, args);
  }
}

export class ParticipationStateV1 {
  collectedToAcceptPayment: BN = new BN(0);
  primarySaleHappened: boolean = false;
  validated: boolean = false;
  printingAuthorizationTokenAccount: PublicKey | null = null;

  constructor(args?: ParticipationStateV1) {
    Object.assign(this, args);
  }
}

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

export class WinningConfig {
  items: WinningConfigItem[] = [];

  constructor(args?: WinningConfig) {
    Object.assign(this, args);
  }
}

export class WinningConfigItem {
  safetyDepositBoxIndex: number = 0;
  amount: number = 0;
  winningConfigType: WinningConfigType = WinningConfigType.TokenOnlyTransfer;

  constructor(args?: WinningConfigItem) {
    Object.assign(this, args);
  }
}

export class WinningConfigState {
  items: WinningConfigStateItem[] = [];
  moneyPushedToAcceptPayment: boolean = false;

  constructor(args?: WinningConfigState) {
    Object.assign(this, args);
  }
}

export class WinningConfigStateItem {
  primarySaleHappened: boolean = false;
  claimed: boolean = false;

  constructor(args?: WinningConfigStateItem) {
    Object.assign(this, args);
  }
}
export class AuctionManagerStateV1 {
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;
  winningConfigItemsValidated: number = 0;

  winningConfigStates: WinningConfigState[] = [];

  participationState: ParticipationStateV1 | null = null;

  constructor(args?: AuctionManagerStateV1) {
    Object.assign(this, args);
  }
}

export class BidRedemptionTicketV1 implements BidRedemptionTicket {
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV1;
  participationRedeemed: boolean = false;
  itemsRedeemed: number = 0;

  constructor(args?: BidRedemptionTicketV1) {
    Object.assign(this, args);
  }

  getBidRedeemed(order: number): boolean {
    return this.participationRedeemed;
  }
}

export async function getSafetyDepositBoxValidationTicket(
  auctionManager: PublicKey,
  safetyDepositBox: PublicKey,
) {
  const PROGRAM_IDS = programIds();
  return (
    await findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        PROGRAM_IDS.metaplex.toBuffer(),
        auctionManager.toBuffer(),
        safetyDepositBox.toBuffer(),
      ],
      PROGRAM_IDS.metaplex,
    )
  )[0];
}

export const DEPRECATED_SCHEMA = new Map<any, any>([
  [
    AuctionManagerV1,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['store', 'pubkey'],
        ['authority', 'pubkey'],
        ['auction', 'pubkey'],
        ['vault', 'pubkey'],
        ['acceptPayment', 'pubkey'],
        ['state', AuctionManagerStateV1],
        ['settings', AuctionManagerSettingsV1],
      ],
    },
  ],
  [
    ParticipationConfigV1,
    {
      kind: 'struct',
      fields: [
        ['winnerConstraint', 'u8'], // enum
        ['nonWinningConstraint', 'u8'],
        ['safetyDepositBoxIndex', 'u8'],
        ['fixedPrice', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
  [
    AuctionManagerSettingsV1,
    {
      kind: 'struct',
      fields: [
        ['winningConfigs', [WinningConfig]],
        [
          'participationConfig',
          { kind: 'option', type: ParticipationConfigV1 },
        ],
      ],
    },
  ],
  [
    WinningConfig,
    {
      kind: 'struct',
      fields: [['items', [WinningConfigItem]]],
    },
  ],
  [
    WinningConfigItem,
    {
      kind: 'struct',
      fields: [
        ['safetyDepositBoxIndex', 'u8'],
        ['amount', 'u8'],
        ['winningConfigType', 'u8'],
      ],
    },
  ],
  [
    WinningConfigState,
    {
      kind: 'struct',
      fields: [
        ['items', [WinningConfigStateItem]],
        ['moneyPushedToAcceptPayment', 'u8'], // bool
      ],
    },
  ],
  [
    WinningConfigStateItem,
    {
      kind: 'struct',
      fields: [
        ['primarySaleHappened', 'u8'], //bool
        ['claimed', 'u8'], // bool
      ],
    },
  ],
  [
    AuctionManagerStateV1,
    {
      kind: 'struct',
      fields: [
        ['status', 'u8'],
        ['winningConfigItemsValidated', 'u8'],
        ['winningConfigStates', [WinningConfigState]],
        ['participationState', { kind: 'option', type: ParticipationStateV1 }],
      ],
    },
  ],
  [
    ParticipationStateV1,
    {
      kind: 'struct',
      fields: [
        ['collectedToAcceptPayment', 'u64'],
        ['primarySaleHappened', 'u8'], //bool
        ['validated', 'u8'], //bool
        [
          'printingAuthorizationTokenAccount',
          { kind: 'option', type: 'pubkey' },
        ],
      ],
    },
  ],
  [
    BidRedemptionTicketV1,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['participationRedeemed', 'u8'], // bool
        ['itemsRedeemed', 'u8'], // bool
      ],
    },
  ],
  [
    DeprecatedPopulateParticipationPrintingAccountArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    DeprecatedInitAuctionManagerV1Args,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['settings', AuctionManagerSettingsV1],
      ],
    },
  ],
  [
    DeprecatedValidateSafetyDepositBoxV1Args,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    DeprecatedRedeemParticipationBidArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    DeprecatedValidateParticipationArgs,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
]);
