import {
  AccountsProvider,
  ConnectionProvider,
  StoreProvider,
  WalletProvider,
  MetaProvider,
} from '@oyster/common';
import { FC } from 'react';
import { ConfettiProvider } from './components/Confetti';
import { AppLayout } from './components/Layout';
import { CoingeckoProvider } from './contexts/coingecko';
import { Storefront } from '@oyster/common';

interface ProvidersProps {
  storefront: Storefront;
  children: React.ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children, storefront }) => {
  return (
    <ConnectionProvider>
      <WalletProvider>
          <AccountsProvider>
            <CoingeckoProvider>
              <StoreProvider
                storefront={storefront}
                storeAddress={process.env.NEXT_PUBLIC_STORE_ADDRESS}
              >
                <MetaProvider>
                  <ConfettiProvider>
                    <AppLayout>{children}</AppLayout>
                  </ConfettiProvider>
                </MetaProvider>
              </StoreProvider>
            </CoingeckoProvider>
          </AccountsProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
