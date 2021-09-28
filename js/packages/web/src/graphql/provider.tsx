import { ENDPOINTS, useConnectionConfig } from '@oyster/common';
import { ENV as ChainId } from '@solana/spl-token-registry';
import { BN } from 'bn.js';
import React, { FC, ReactNode, useMemo } from 'react';
import {
  createClient,
  fetchExchange,
  dedupExchange,
  cacheExchange,
  Provider,
} from 'urql';
import customScalarsExchange from 'urql-custom-scalars-exchange';
import schema from './generated/schema.json';

const scalarsExchange = customScalarsExchange({
  schema: schema as any,
  scalars: {
    BN(value) {
      return new BN(value, 10);
    },
  },
});

const DEFAULT_GRAPHQL_URL = 'https://metaplex-graphql-staging.herokuapp.com/';

const NETWORK_MAP = {
  [ChainId.MainnetBeta]: 'mainnet-beta',
  [ChainId.Devnet]: 'devnet',
  [ChainId.Testnet]: 'testnet',
};

export const GraphqlProvider: FC<{ url?: string; children: ReactNode }> = ({
  children,
  url = DEFAULT_GRAPHQL_URL,
}) => {
  const { endpoint } = useConnectionConfig();
  const client = useMemo(() => {
    const chainId =
      ENDPOINTS.find(end => end.endpoint === endpoint)?.ChainId ||
      ChainId.MainnetBeta;
    const network = NETWORK_MAP[chainId];

    return createClient({
      url,
      fetchOptions: {
        headers: {
          network,
        },
      },
      exchanges: [dedupExchange, scalarsExchange, cacheExchange, fetchExchange],
    });
  }, [endpoint, url]);
  return <Provider value={client}>{children}</Provider>;
};
