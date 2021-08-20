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

interface ProvidersProps {
  storeId: string;
  children: React.ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children, storeId }) => {
  return (
    <ConnectionProvider>
      <WalletProvider>
        <UseWalletProvider chainId={5}>
          <AccountsProvider>
            <CoingeckoProvider>
              <StoreProvider
                ownerAddress={storeId}
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
        </UseWalletProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
