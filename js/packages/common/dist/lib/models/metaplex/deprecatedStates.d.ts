import BN from 'bn.js';
import { AuctionManagerStatus, BidRedemptionTicket, MetaplexKey, NonWinningConstraint, WinningConfigType, WinningConstraint } from '.';
export declare const MAX_BID_REDEMPTION_TICKET_V1_SIZE = 3;
export declare class AuctionManagerV1 {
    key: MetaplexKey;
    store: string;
    authority: string;
    auction: string;
    vault: string;
    acceptPayment: string;
    state: AuctionManagerStateV1;
    settings: AuctionManagerSettingsV1;
    constructor(args: {
        store: string;
        authority: string;
        auction: string;
        vault: string;
        acceptPayment: string;
        state: AuctionManagerStateV1;
        settings: AuctionManagerSettingsV1;
    });
}
export declare class DeprecatedInitAuctionManagerV1Args {
    instruction: number;
    settings: AuctionManagerSettingsV1;
    constructor(args: {
        settings: AuctionManagerSettingsV1;
    });
}
export declare class DeprecatedValidateSafetyDepositBoxV1Args {
    instruction: number;
}
export declare class DeprecatedRedeemParticipationBidArgs {
    instruction: number;
}
export declare class DeprecatedPopulateParticipationPrintingAccountArgs {
    instruction: number;
}
export declare class DeprecatedValidateParticipationArgs {
    instruction: number;
}
export declare class AuctionManagerSettingsV1 {
    winningConfigs: WinningConfig[];
    participationConfig: ParticipationConfigV1 | null;
    constructor(args?: AuctionManagerSettingsV1);
}
export declare class ParticipationStateV1 {
    collectedToAcceptPayment: BN;
    primarySaleHappened: boolean;
    validated: boolean;
    printingAuthorizationTokenAccount: string | null;
    constructor(args?: ParticipationStateV1);
}
export declare class ParticipationConfigV1 {
    winnerConstraint: WinningConstraint;
    nonWinningConstraint: NonWinningConstraint;
    safetyDepositBoxIndex: number;
    fixedPrice: BN | null;
    constructor(args?: ParticipationConfigV1);
}
export declare class WinningConfig {
    items: WinningConfigItem[];
    constructor(args?: WinningConfig);
}
export declare class WinningConfigItem {
    safetyDepositBoxIndex: number;
    amount: number;
    winningConfigType: WinningConfigType;
    constructor(args?: WinningConfigItem);
}
export declare class WinningConfigState {
    items: WinningConfigStateItem[];
    moneyPushedToAcceptPayment: boolean;
    constructor(args?: WinningConfigState);
}
export declare class WinningConfigStateItem {
    primarySaleHappened: boolean;
    claimed: boolean;
    constructor(args?: WinningConfigStateItem);
}
export declare class AuctionManagerStateV1 {
    status: AuctionManagerStatus;
    winningConfigItemsValidated: number;
    winningConfigStates: WinningConfigState[];
    participationState: ParticipationStateV1 | null;
    constructor(args?: AuctionManagerStateV1);
}
export declare class BidRedemptionTicketV1 implements BidRedemptionTicket {
    key: MetaplexKey;
    participationRedeemed: boolean;
    itemsRedeemed: number;
    constructor(args?: BidRedemptionTicketV1);
    getBidRedeemed(): boolean;
}
export declare function getSafetyDepositBoxValidationTicket(auctionManager: string, safetyDepositBox: string): Promise<string>;
export declare const DEPRECATED_SCHEMA: Map<any, any>;
//# sourceMappingURL=deprecatedStates.d.ts.map