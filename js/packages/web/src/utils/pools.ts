import { cache, TokenAccount, useConnection } from '@oyster/common';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import { useEffect, useMemo, useState } from 'react';
import { useCachedPool } from './accounts';

export enum PoolOperation {
  Add,
  SwapGivenInput,
  SwapGivenProceeds,
}

export interface PoolInfo {
  pubkeys: {
    program: PublicKey;
    account: PublicKey;
    holdingAccounts: PublicKey[];
    holdingMints: PublicKey[];
    mint: PublicKey;
    feeAccount?: PublicKey;
  };
  legacy: boolean;
  raw: {
    pubkey: PublicKey;
    data: any;
    account: AccountInfo<Buffer>;
  };
}

export enum CurveType {
  ConstantProduct = 0,
  ConstantPrice = 1,
  Stable = 2,
  ConstantProductWithOffset = 3,
}

export interface LiquidityComponent {
  amount: number;
  account?: TokenAccount;
  mintAddress: string;
}

export interface PoolConfig {
  curveType: CurveType;
  fees: {
    tradeFeeNumerator: number;
    tradeFeeDenominator: number;
    ownerTradeFeeNumerator: number;
    ownerTradeFeeDenominator: number;
    ownerWithdrawFeeNumerator: number;
    ownerWithdrawFeeDenominator: number;
    hostFeeNumerator: number;
    hostFeeDenominator: number;
  };

  token_b_offset?: number;
  token_b_price?: number;
}

export const usePoolForBasket = (mints: (string | undefined)[]) => {
  const connection = useConnection();
  const { pools } = useCachedPool();
  const [pool, setPool] = useState<PoolInfo>();
  const sortedMints = useMemo(() => [...mints].sort(), [...mints]); // eslint-disable-line

  useEffect(() => {
    (async () => {
      // reset pool during query
      setPool(undefined);
      const matchingPool = pools
        .filter((p) => !p.legacy)
        .filter((p) =>
          p.pubkeys.holdingMints
            .map((a) => a.toBase58())
            .sort()
            .every((address, i) => address === sortedMints[i])
        );

      const poolQuantities: { [pool: string]: number } = {};
      for (let i = 0; i < matchingPool.length; i++) {
        const p = matchingPool[i];

        const [account0, account1] = await Promise.all([
          cache.query(connection, p.pubkeys.holdingAccounts[0]),
          cache.query(connection, p.pubkeys.holdingAccounts[1]),
        ]);
        const amount =
          (account0.info.amount.toNumber() || 0) +
          (account1.info.amount.toNumber() || 0);
        if (amount > 0) {
          poolQuantities[i.toString()] = amount;
        }
      }
      if (Object.keys(poolQuantities).length > 0) {
        const sorted = Object.entries(
          poolQuantities
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ).sort(([pool0Idx, amount0], [pool1Idx, amount1]) =>
          amount0 > amount1 ? -1 : 1
        );
        const bestPool = matchingPool[parseInt(sorted[0][0])];
        setPool(bestPool);
        return;
      }
    })();
  }, [connection, sortedMints, pools]);

  return pool;
};

function estimateProceedsFromInput(
  inputQuantityInPool: number,
  proceedsQuantityInPool: number,
  inputAmount: number
): number {
  return (
    (proceedsQuantityInPool * inputAmount) / (inputQuantityInPool + inputAmount)
  );
}

function estimateInputFromProceeds(
  inputQuantityInPool: number,
  proceedsQuantityInPool: number,
  proceedsAmount: number
): number | string {
  if (proceedsAmount >= proceedsQuantityInPool) {
    return "Not possible";
  }

  return (
    (inputQuantityInPool * proceedsAmount) /
    (proceedsQuantityInPool - proceedsAmount)
  );
}

export async function calculateDependentAmount(
  connection: Connection,
  independent: string,
  amount: number,
  pool: PoolInfo,
  op: PoolOperation
): Promise<number | string | undefined> {
  const poolMint = await cache.queryMint(connection, pool.pubkeys.mint);
  const accountA = await cache.query(
    connection,
    pool.pubkeys.holdingAccounts[0]
  );
  const amountA = accountA.info.amount.toNumber();

  const accountB = await cache.query(
    connection,
    pool.pubkeys.holdingAccounts[1]
  );
  let amountB = accountB.info.amount.toNumber();

  if (!poolMint.mintAuthority) {
    throw new Error("Mint doesnt have authority");
  }

  if (poolMint.supply.eqn(0)) {
    return;
  }

  let offsetAmount = 0;
  const offsetCurve = pool.raw?.data?.curve?.offset;
  if (offsetCurve) {
    offsetAmount = offsetCurve.token_b_offset;
    amountB = amountB + offsetAmount;
  }

  const mintA = await cache.queryMint(connection, accountA.info.mint);
  const mintB = await cache.queryMint(connection, accountB.info.mint);

  if (!mintA || !mintB) {
    return;
  }

  const isFirstIndependent = accountA.info.mint.toBase58() === independent;
  const depPrecision = Math.pow(
    10,
    isFirstIndependent ? mintB.decimals : mintA.decimals
  );
  const indPrecision = Math.pow(
    10,
    isFirstIndependent ? mintA.decimals : mintB.decimals
  );
  const indAdjustedAmount = amount * indPrecision;
  const indBasketQuantity = isFirstIndependent ? amountA : amountB;
  const depBasketQuantity = isFirstIndependent ? amountB : amountA;

  let depAdjustedAmount;

  const constantPrice = pool.raw?.data?.curve?.constantPrice;
  if (constantPrice) {
    if (isFirstIndependent) {
      depAdjustedAmount = (amount * depPrecision) / constantPrice.token_b_price;
    } else {
      depAdjustedAmount = (amount * depPrecision) * constantPrice.token_b_price;
    }
  } else {
    switch (+op) {
      case PoolOperation.Add:
        depAdjustedAmount =
          (depBasketQuantity / indBasketQuantity) * indAdjustedAmount;
        break;
      case PoolOperation.SwapGivenProceeds:
        depAdjustedAmount = estimateInputFromProceeds(
          depBasketQuantity,
          indBasketQuantity,
          indAdjustedAmount
        );
        break;
      case PoolOperation.SwapGivenInput:
        depAdjustedAmount = estimateProceedsFromInput(
          indBasketQuantity,
          depBasketQuantity,
          indAdjustedAmount
        );
        break;
    }
  }

  if (typeof depAdjustedAmount === "string") {
    return depAdjustedAmount;
  }
  if (depAdjustedAmount === undefined) {
    return undefined;
  }
  return depAdjustedAmount / depPrecision;
}
