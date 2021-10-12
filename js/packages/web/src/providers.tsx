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
import {GatewayProvider} from "./contexts/gateway";
import {GatekeeperNetworkProvider} from "./contexts/gatekeeperNetwork";

export const Providers: FC = ({ children }) => {
  return (
    <ConnectionProvider>
      <WalletProvider>
        <AccountsProvider>
          <CoingeckoProvider>
            <GatekeeperNetworkProvider>
              <GatewayProvider>
                <StoreProvider
                  ownerAddress={process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS}
                  storeAddress={process.env.NEXT_PUBLIC_STORE_ADDRESS}
                >
                  <MetaProvider>
                    <LoaderProvider>
                      <ConfettiProvider>
                        <AppLayout>{children}</AppLayout>
                      </ConfettiProvider>
                    </LoaderProvider>
                  </MetaProvider>
                </StoreProvider>
              </GatewayProvider>
            </GatekeeperNetworkProvider>
          </CoingeckoProvider>
        </AccountsProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
