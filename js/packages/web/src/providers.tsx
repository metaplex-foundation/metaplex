import {
  AccountsProvider,
  ConnectionProvider,
  StoreProvider,
  WalletProvider,
  MetaProvider,
} from '@oyster/common';
import React, { FC } from 'react';
import { ConfettiProvider } from './components/Confetti';
import { AppLayout } from './components/Layout';
import { LoaderProvider } from './components/Loader';
import { CoingeckoProvider } from './contexts/coingecko';
import { Storefront } from '@oyster/common';
import { AnalyticsProvider } from './contexts';

interface ProvidersProps {
  storefront: Storefront;
  children: React.ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children, storefront }) => {
  return (
    <ConnectionProvider>
      <StoreProvider
        storefront={storefront}
        storeAddress={process.env.NEXT_PUBLIC_STORE_ADDRESS}
      >
        <WalletProvider>
          <AccountsProvider>
            <CoingeckoProvider>
              <MetaProvider>
                <LoaderProvider>
                  <ConfettiProvider>
                    <AnalyticsProvider>
                      <AppLayout storefront={storefront}>{children}</AppLayout>
                    </AnalyticsProvider>
                  </ConfettiProvider>
                </LoaderProvider>
              </MetaProvider>
            </CoingeckoProvider>
          </AccountsProvider>
        </WalletProvider>
      </StoreProvider>
    </ConnectionProvider>
  );
};
