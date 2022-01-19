import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  TokenInfo,
  TokenListContainer,
  TokenListProvider,
} from "@solana/spl-token-registry";
import { WRAPPED_SOL_MINT } from '@project-serum/serum/lib/token-instructions';

// Tag in the spl-token-registry for sollet wrapped tokens.
export const SPL_REGISTRY_SOLLET_TAG = "wrapped-sollet";

// Tag in the spl-token-registry for wormhole wrapped tokens.
export const SPL_REGISTRY_WORM_TAG = "wormhole";

export interface TokenListContextState {
  mainnetTokens: TokenInfo[];
  tokenMap: Map<string, TokenInfo>;
  wormholeMap: Map<string, TokenInfo>;
  solletMap: Map<string, TokenInfo>;
  swappableTokens: TokenInfo[];
  swappableTokensSollet: TokenInfo[];
  swappableTokensWormhole: TokenInfo[];
  hasOtherTokens: boolean;
}

const TokenListContext =
  React.createContext<TokenListContextState | null>(null);

export function SPLTokenListProvider({ children = null as any }) {
  const [tokenList, setTokenList] = useState<TokenListContainer | null>(null);

  const subscribedTokenMints = process.env.NEXT_SPL_TOKEN_MINTS?
    [

      WRAPPED_SOL_MINT,
      ...process.env.NEXT_SPL_TOKEN_MINTS.split(",")
    ]: [WRAPPED_SOL_MINT]

  useEffect(() => {
    new TokenListProvider().resolve().then(setTokenList);
  }, [setTokenList]);

  const hasOtherTokens = !!process.env.NEXT_SPL_TOKEN_MINTS;

  // Added tokenList to know in which currency the auction is (SOL or other SPL)
  const mainnetTokens = tokenList?tokenList.filterByClusterSlug("mainnet-beta").getList().filter(f=> subscribedTokenMints.some(s=> s == f.address) )
    :[]

  const tokenMap = useMemo(() => {
    const tokenMap = new Map();
    mainnetTokens.forEach((t: TokenInfo) => {
      tokenMap.set(t.address, t);
    });
    return tokenMap;
  }, [tokenList]);

  // Tokens with USD(x) quoted markets.
  const swappableTokens = useMemo(() => {
    const tokens = mainnetTokens.filter((t: TokenInfo) => {
      const isUsdxQuoted =
        t.extensions?.serumV3Usdt || t.extensions?.serumV3Usdc;
      return isUsdxQuoted;
    });
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return tokens;
  }, [tokenList, tokenMap]);

  // Sollet wrapped tokens.
  const [swappableTokensSollet, solletMap] = useMemo(() => {
    const tokens = mainnetTokens.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes(SPL_REGISTRY_SOLLET_TAG);
      return isSollet;
    });
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return [
      tokens,
      new Map<string, TokenInfo>(tokens.map((t: TokenInfo) => [t.address, t])),
    ];
  }, [tokenList]);

  // Wormhole wrapped tokens.
  const [swappableTokensWormhole, wormholeMap] = useMemo(() => {
    const tokens = mainnetTokens.filter((t: TokenInfo) => {
      const isSollet = t.tags?.includes(SPL_REGISTRY_WORM_TAG);
      return isSollet;
    });
    tokens.sort((a: TokenInfo, b: TokenInfo) =>
      a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0
    );
    return [
      tokens,
      new Map<string, TokenInfo>(tokens.map((t: TokenInfo) => [t.address, t])),
    ];
  }, [tokenList]);

  return (
    <TokenListContext.Provider value={{
      mainnetTokens,
      tokenMap,
      wormholeMap,
      solletMap,
      swappableTokens,
      swappableTokensWormhole,
      swappableTokensSollet,
      hasOtherTokens
    }}>
      {children}
    </TokenListContext.Provider>
  );
}

export const useTokenMap = () => {
  const { tokenMap } = useTokenList();
  return tokenMap;
}

export const useSwappableTokens = () => {
  const { swappableTokens, swappableTokensWormhole, swappableTokensSollet } = useTokenList();
  return { swappableTokens, swappableTokensWormhole, swappableTokensSollet };
}

export const queryTokenList = () => {
  const { mainnetTokens } = useTokenList();

  return mainnetTokens;
};

export const useTokenList = () => {
  const context = useContext(TokenListContext);
  return context as TokenListContextState;
};
