import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { KnownTokenMap } from '../../utils';
export declare const TokenIcon: (props: {
    mintAddress?: string | PublicKey;
    style?: React.CSSProperties;
    size?: number;
    className?: string;
    tokenMap?: KnownTokenMap;
}) => JSX.Element;
export declare const PoolIcon: (props: {
    mintA: string;
    mintB: string;
    style?: React.CSSProperties;
    className?: string;
}) => JSX.Element;
//# sourceMappingURL=index.d.ts.map