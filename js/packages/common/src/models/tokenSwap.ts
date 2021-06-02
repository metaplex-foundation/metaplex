import * as BufferLayout from 'buffer-layout';
import { publicKey, uint64 } from '../utils/layout';

export { TokenSwap } from '@solana/spl-token-swap';

const FEE_LAYOUT = BufferLayout.struct(
  [
    BufferLayout.nu64('tradeFeeNumerator'),
    BufferLayout.nu64('tradeFeeDenominator'),
    BufferLayout.nu64('ownerTradeFeeNumerator'),
    BufferLayout.nu64('ownerTradeFeeDenominator'),
    BufferLayout.nu64('ownerWithdrawFeeNumerator'),
    BufferLayout.nu64('ownerWithdrawFeeDenominator'),
    BufferLayout.nu64('hostFeeNumerator'),
    BufferLayout.nu64('hostFeeDenominator'),
  ],
  'fees',
);

export const TokenSwapLayoutLegacyV0 = BufferLayout.struct([
  BufferLayout.u8('isInitialized'),
  BufferLayout.u8('nonce'),
  publicKey('tokenAccountA'),
  publicKey('tokenAccountB'),
  publicKey('tokenPool'),
  uint64('feesNumerator'),
  uint64('feesDenominator'),
]);

export const TokenSwapLayoutV1: typeof BufferLayout.Structure =
  BufferLayout.struct([
    BufferLayout.u8('isInitialized'),
    BufferLayout.u8('nonce'),
    publicKey('tokenProgramId'),
    publicKey('tokenAccountA'),
    publicKey('tokenAccountB'),
    publicKey('tokenPool'),
    publicKey('mintA'),
    publicKey('mintB'),
    publicKey('feeAccount'),
    BufferLayout.u8('curveType'),
    uint64('tradeFeeNumerator'),
    uint64('tradeFeeDenominator'),
    uint64('ownerTradeFeeNumerator'),
    uint64('ownerTradeFeeDenominator'),
    uint64('ownerWithdrawFeeNumerator'),
    uint64('ownerWithdrawFeeDenominator'),
    BufferLayout.blob(16, 'padding'),
  ]);

const CURVE_NODE = BufferLayout.union(
  BufferLayout.u8(),
  BufferLayout.blob(32),
  'curve',
);
CURVE_NODE.addVariant(0, BufferLayout.struct([]), 'constantProduct');
CURVE_NODE.addVariant(
  1,
  BufferLayout.struct([BufferLayout.nu64('token_b_price')]),
  'constantPrice',
);
CURVE_NODE.addVariant(2, BufferLayout.struct([]), 'stable');
CURVE_NODE.addVariant(
  3,
  BufferLayout.struct([BufferLayout.nu64('token_b_offset')]),
  'offset',
);

export const TokenSwapLayout: typeof BufferLayout.Structure =
  BufferLayout.struct([
    BufferLayout.u8('isInitialized'),
    BufferLayout.u8('nonce'),
    publicKey('tokenProgramId'),
    publicKey('tokenAccountA'),
    publicKey('tokenAccountB'),
    publicKey('tokenPool'),
    publicKey('mintA'),
    publicKey('mintB'),
    publicKey('feeAccount'),
    FEE_LAYOUT,
    CURVE_NODE,
  ]);
