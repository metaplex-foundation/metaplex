import { TokenAccount } from '@oyster/common';
import { MintInfo } from '@solana/spl-token';
import { PoolConfig, PoolOperation } from '../utils/pools';

export interface CurrencyContextState {
  mintAddress: string;
  account?: TokenAccount;
  mint?: MintInfo;
  amount: string;
  name: string;
  icon?: string;
  setAmount: (val: string) => void;
  setMint: (mintAddress: string) => void;
  convertAmount: () => number;
  sufficientBalance: () => boolean;
}

export interface CurrencyPairContextState {
  A: CurrencyContextState;
  B: CurrencyContextState;
  lastTypedAccount: string;
  setLastTypedAccount: (mintAddress: string) => void;
  setPoolOperation: (swapDirection: PoolOperation) => void;
  options: PoolConfig;
  setOptions: (config: PoolConfig) => void;
}
