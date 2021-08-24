import { WalletAdapter } from '@solana/wallet-base';

import Wallet from '@project-serum/sol-wallet-adapter';
import { Button } from 'antd';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { notify } from './../utils/notifications';
import { useConnectionConfig } from './connection';
import { useLocalStorageState } from '../utils/utils';
import { PhantomWalletAdapter } from '../wallet-adapters/phantom';
import { useLocation } from 'react-router';
import { MetaplexModal } from '../components/MetaplexModal';
import { TorusWalletAdapter } from '../wallet-adapters/torus';
import { SolflareWalletAdapter } from '../wallet-adapters/solflare';

const ASSETS_URL =
  'https://raw.githubusercontent.com/solana-labs/oyster/main/assets/wallets/';
export const WALLET_PROVIDERS = [
  {
    name: 'Phantom',
    url: 'https://www.phantom.app',
    icon: `https://www.phantom.app/img/logo.png`,
    adapter: PhantomWalletAdapter,
  },
  {
    name: 'Solflare',
    url: 'https://solflare.com',
    icon: `${ASSETS_URL}solflare.svg`,
    adapter: SolflareWalletAdapter,
  },
  {
    name: 'Sollet',
    url: 'https://www.sollet.io',
    icon: `${ASSETS_URL}sollet.svg`,
  },
  {
    name: 'MathWallet',
    url: 'https://mathwallet.org',
    icon: `${ASSETS_URL}mathwallet.svg`,
  },
  {
    name: 'Torus',
    url: 'https://tor.us',
    icon: `${ASSETS_URL}torus.svg`,
    adapter: TorusWalletAdapter,
  },
];

const WalletContext = React.createContext<{
  wallet: WalletAdapter | undefined;
  connected: boolean;
  select: () => void;
  provider: typeof WALLET_PROVIDERS[number] | undefined;
}>({
  wallet: undefined,
  connected: false,
  select() {},
  provider: undefined,
});

export function WalletProvider({ children = null as any }) {
  const { endpoint } = useConnectionConfig();
  const location = useLocation();
  const [autoConnect, setAutoConnect] = useState(
    location.pathname.indexOf('result=') >= 0 || false,
  );
  const [providerUrl, setProviderUrl] = useLocalStorageState('walletProvider');

  const provider = useMemo(
    () => WALLET_PROVIDERS.find(({ url }) => url === providerUrl),
    [providerUrl],
  );

  const wallet = useMemo(
    function () {
      if (provider) {
        return new (provider.adapter || Wallet)(
          providerUrl,
          endpoint,
        ) as WalletAdapter;
      }
    },
    [provider, providerUrl, endpoint],
  );

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (wallet?.publicKey && connected) {
      const walletPublicKey = wallet.publicKey.toBase58();
      const keyToDisplay =
        walletPublicKey.length > 20
          ? `${walletPublicKey.substring(0, 7)}.....${walletPublicKey.substring(
              walletPublicKey.length - 7,
              walletPublicKey.length,
            )}`
          : walletPublicKey;
      notify({
        message: 'Wallet update',
        description: 'Connected to wallet ' + keyToDisplay,
      });
    }
  }, [connected]);

  useEffect(() => {
    if (wallet) {
      wallet.on('connect', () => {
        if (wallet.publicKey) {
          setConnected(true);
        }
      });

      wallet.on('disconnect', () => {
        setConnected(false);
        notify({
          message: 'Wallet update',
          description: 'Disconnected from wallet',
        });
      });
    }

    return () => {
      setConnected(false);
      if (wallet) {
        wallet.disconnect();
      }
    };
  }, [wallet]);

  useEffect(() => {
    if (wallet && autoConnect) {
      wallet.connect();
      setAutoConnect(false);
    }

    return () => {};
  }, [wallet, autoConnect]);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showProviders, setShowProviders] = useState(false);

  const select = useCallback(() => setIsModalVisible(true), []);
  const close = useCallback(() => {
    setIsModalVisible(false);
    setShowProviders(false);
  }, []);

  const pp = WALLET_PROVIDERS.find(wp => wp.name === 'Phantom');

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connected,
        select,
        provider,
      }}
    >
      {children}
      <MetaplexModal visible={isModalVisible} onCancel={close}>
        <div
          style={{
            background:
              'linear-gradient(180deg, #D329FC 0%, #8F6DDE 49.48%, #19E6AD 100%)',
            borderRadius: 36,
            width: 50,
            height: 50,
            textAlign: 'center',
            verticalAlign: 'middle',
            fontWeight: 700,
            fontSize: '1.3rem',
            lineHeight: 2.4,
            marginBottom: 10,
          }}
        >
          M
        </div>

        <h2>{provider ? 'Change provider' : 'Welcome to Metaplex'}</h2>
        <p>
          {provider
            ? 'Feel free to switch wallet provider'
            : 'You must be signed in to place a bid'}
        </p>

        <br />

        {provider || showProviders ? (
          <>
            {WALLET_PROVIDERS.map((provider, idx) => {
              if (providerUrl === provider.url) return null;

              const onClick = function () {
                setProviderUrl(provider.url);
                setAutoConnect(true);
                close();
              };
              return (
                <Button
                  key={idx}
                  size="large"
                  type={providerUrl === provider.url ? 'primary' : 'ghost'}
                  onClick={onClick}
                  icon={
                    <img
                      alt={`${provider.name}`}
                      width={20}
                      height={20}
                      src={provider.icon}
                      style={{ marginRight: 8 }}
                    />
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: 8,
                  }}
                >
                  {provider.name}
                </Button>
              );
            })}
          </>
        ) : (
          <>
            <Button
              className="metaplex-button"
              style={{
                width: '80%',
                fontWeight: 'unset',
              }}
              onClick={_ => {
                setProviderUrl(pp?.url);
                setAutoConnect(true);
                close();
              }}
            >
              <span>
                <img src={pp?.icon} style={{ width: '1.2rem' }} />
                &nbsp;Sign in with Phantom
              </span>
              <span>&gt;</span>
            </Button>
            <p
              onClick={_ => setShowProviders(true)}
              style={{ cursor: 'pointer', marginTop: 10 }}
            >
              Select a different Solana wallet
            </p>
          </>
        )}
      </MetaplexModal>
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const { wallet, connected, provider, select } = useContext(WalletContext);
  return {
    wallet,
    connected,
    provider,
    select,
    connect() {
      wallet ? wallet.connect() : select();
    },
    disconnect() {
      wallet?.disconnect();
    },
  };
};
