import { Connection } from '@solana/web3.js';
import { LiquidityComponent, PoolInfo } from '../utils/pools';

export async function swap(
  connection: Connection,
  wallet: any,
  components: LiquidityComponent[],
  // SLIPPAGE: number,
  pool?: PoolInfo,
) {
  console.log('--swap action', )
}
