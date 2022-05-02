import React, { useContext, useEffect, useState } from 'react';

export const COINGECKO_POOL_INTERVAL = 1000 * 60; // 60 sec
export const COINGECKO_API = 'https://api.coingecko.com/api/v3/';
export const COINGECKO_COIN_PRICE_API = `${COINGECKO_API}simple/price`;
export interface CoingeckoContextState {
  solPrice: number;
  allSplPrices: AllSplTokens[];
}
export interface AllSplTokens {
  tokenName: string;
  tokenMint: string;
  tokenPrice: number;
}

export const solToUSD = async (): Promise<number> => {
  const url = `${COINGECKO_COIN_PRICE_API}?ids=solana&vs_currencies=usd`;
  const resp = await window.fetch(url).then(resp => resp.json());
  return resp.solana.usd;
};

export const altSplToUSD = async (cgTokenName?: string): Promise<number> => {
  if (
    !process.env.NEXT_SPL_TOKEN_MINTS ||
    process.env.NEXT_SPL_TOKEN_MINTS.length == 0
  )
    return 0;

  const cg_spl_token_id = cgTokenName
    ? cgTokenName.toLowerCase().split(' ').join('-')
    : process.env.NEXT_CG_SPL_TOKEN_ID || '';
  const url = `${COINGECKO_COIN_PRICE_API}?ids=${cg_spl_token_id}&vs_currencies=usd`;
  const resp = await window.fetch(url).then(resp => resp.json());
  //console.log("[--P]Processing", cgTokenName, resp)
  return resp[cg_spl_token_id]?.usd;
};

const CoingeckoContext = React.createContext<CoingeckoContextState | null>(
  null,
);

export function CoingeckoProvider({ children = null }: { children: any }) {
  const [solPrice, setSolPrice] = useState<number>(0);
  const [allSplPrices, setAllSplPrices] = useState<AllSplTokens[]>([]);

  useEffect(() => {
    let timerId = 0;
    const queryPrice = async () => {
      const solprice = await solToUSD();
      setSolPrice(solprice);

      const subscribedTokenMints = process.env.NEXT_SPL_TOKEN_MINTS
        ? process.env.NEXT_SPL_TOKEN_MINTS.split(',')
        : [];
      const subscribedTokenIDS = process.env.NEXT_CG_SPL_TOKEN_IDS
        ? process.env.NEXT_CG_SPL_TOKEN_IDS.split(',')
        : [];

      const splPricePromises: Promise<AllSplTokens | void>[] = [];
      for (let i = 0; i < subscribedTokenMints.length; i++) {
        const splName = subscribedTokenIDS[i];
        const splMint = subscribedTokenMints[i];

        //console.log("[--P]PROCESSING TOKEN",i,  splName, splMint)
        splPricePromises.push(
          (async () => {
            try {
              const splPrice = await altSplToUSD(splName);
              //console.log("[--P]PRICE", splPrice)
              return {
                tokenMint: splMint,
                tokenName: splName,
                tokenPrice: splPrice,
              };
            } catch (e) {
              //console.log("[--P] error setting", e)
            }
          })(),
        );
      }
      const allSplPrices = await Promise.all(splPricePromises);
      setAllSplPrices(allSplPrices.filter(Boolean) as AllSplTokens[]);
      //console.log("[--P]SUBSCRIBED TOKENS", allSplPrices)
      startTimer();
    };

    const startTimer = () => {
      timerId = window.setTimeout(async () => {
        queryPrice();
      }, COINGECKO_POOL_INTERVAL);
    };

    queryPrice();
    return () => {
      clearTimeout(timerId);
    };
  }, [setSolPrice, setAllSplPrices]);

  return (
    <CoingeckoContext.Provider value={{ solPrice, allSplPrices }}>
      {children}
    </CoingeckoContext.Provider>
  );
}

export const useCoingecko = () => {
  const context = useContext(CoingeckoContext);
  return context as CoingeckoContextState;
};

export const useSolPrice = () => {
  const { solPrice } = useCoingecko();

  return solPrice;
};

export const useAllSplPrices = () => {
  const { allSplPrices } = useCoingecko();

  return allSplPrices;
};
