import {
  AccountsProvider,
  ConnectionProvider,
  StoreProvider,
  WalletProvider,
} from '@oyster/common';
import { FC } from 'react';
import { UseWalletProvider } from 'use-wallet';
import { ConfettiProvider } from './components/Confetti';
import { AppLayout } from './components/Layout';
import { MetaProvider } from './contexts/meta';
import { CoingeckoProvider } from './contexts/coingecko';
import { QueryParamProvider } from 'use-query-params';
import { Route } from 'react-router-dom';
import { ApeProvider } from './contexts';

export const Providers: FC = ({ children }) => {
  return (
    <ConnectionProvider>
      <WalletProvider>
        <UseWalletProvider chainId={5}>
          <AccountsProvider>
            <CoingeckoProvider>
              <QueryParamProvider ReactRouterRoute={Route}>
                <ApeProvider>
                  <StoreProvider
                    ownerAddress={process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}
                    storeAddress={process.env.NEXT_PUBLIC_STORE_ADDRESS}
                  >
                    <MetaProvider>
                      <ConfettiProvider>
                        <AppLayout>{children}</AppLayout>
                      </ConfettiProvider>
                    </MetaProvider>
                  </StoreProvider>
                </ApeProvider>
              </QueryParamProvider>
            </CoingeckoProvider>
          </AccountsProvider>
        </UseWalletProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
