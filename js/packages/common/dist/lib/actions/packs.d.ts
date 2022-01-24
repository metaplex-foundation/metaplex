import BN from 'bn.js';
import { PackDistributionType } from '../models/packs/types';
import { AddCardToPackParams, InitPackSetParams, RequestCardToRedeemParams, ClaimPackParams } from '../models/packs/interface';
export declare class InitPackSetArgs {
    instruction: number;
    name: Uint8Array;
    description: string;
    uri: string;
    mutable: boolean;
    distributionType: PackDistributionType;
    allowedAmountToRedeem: BN;
    redeemStartDate: BN | null;
    redeemEndDate: BN | null;
    constructor(args: InitPackSetParams);
}
export declare class AddCardToPackArgs {
    instruction: number;
    maxSupply: BN | null;
    weight: BN | null;
    index: number;
    constructor(args: AddCardToPackParams);
}
export declare class AddVoucherToPackArgs {
    instruction: number;
    constructor();
}
export declare class ActivatePackArgs {
    instruction: number;
    constructor();
}
export declare class ClaimPackArgs {
    instruction: number;
    index: number;
    constructor(args: ClaimPackParams);
}
export declare class RequestCardToRedeemArgs {
    instruction: number;
    index: number;
    constructor(args: RequestCardToRedeemParams);
}
export declare class CleanUpArgs {
    instruction: number;
    constructor();
}
export declare const PACKS_SCHEMA: Map<any, any>;
//# sourceMappingURL=packs.d.ts.map