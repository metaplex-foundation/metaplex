import { FC } from 'react';
import { contexts } from '@oyster/common';
import { UseWalletProvider } from 'use-wallet';
import { MetaProvider } from '../contexts';
import { CoingeckoProvider } from '../contexts/coingecko';
import { ConfettiProvider } from '../components/Confetti';
import { AppLayout } from '../components/Layout';

const { WalletProvider } = contexts.Wallet;
const { ConnectionProvider } = contexts.Connection;
const { AccountsProvider } = contexts.Accounts;

const PageProviders: FC<{ accounts?: any[] }> = ({ children, accounts }) => {
  return (
    <ConnectionProvider
      storeId={process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS_ADDRESS}
    >
      <WalletProvider>
        <UseWalletProvider chainId={5}>
          <AccountsProvider>
            <CoingeckoProvider>
              <MetaProvider initAccounts={accounts}>
                <ConfettiProvider>
                  <AppLayout>{children}</AppLayout>
                </ConfettiProvider>
              </MetaProvider>
            </CoingeckoProvider>
          </AccountsProvider>
        </UseWalletProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default PageProviders;
