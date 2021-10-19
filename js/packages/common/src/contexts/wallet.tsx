import { WalletAdapter, WalletError } from '@solana/wallet-adapter-base';
import {
  useWallet,
  WalletProvider as BaseWalletProvider,
} from '@solana/wallet-adapter-react';
import {
  getLedgerWallet,
  getMathWallet,
  getPhantomWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolongWallet,
  getTorusWallet,
  WalletName,
} from '@solana/wallet-adapter-wallets';
import { Button, Collapse } from 'antd';
import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { notify } from '../utils';
import { MetaplexModal } from '../components';

const { Panel } = Collapse;

export interface WalletModalContextState {
  visible: boolean;
  setVisible: (open: boolean) => void;
}

export const WalletModalContext = createContext<WalletModalContextState>(
  {} as WalletModalContextState,
);

export function useWalletModal(): WalletModalContextState {
  return useContext(WalletModalContext);
}

export const WalletModal: FC = () => {
  const { wallets, wallet: selected, select } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const [showWallets, setShowWallets] = useState(false);
  const close = useCallback(() => {
    setVisible(false);
    setShowWallets(false);
  }, [setVisible, setShowWallets]);

  const phatomWallet = useMemo(() => getPhantomWallet(), []);

  return (
    <MetaplexModal title="Connect Wallet" visible={visible} onCancel={close}>
      <span
        style={{
          color: 'rgba(255, 255, 255, 0.75)',
          fontSize: '14px',
          lineHeight: '14px',
          fontFamily: 'GraphikWeb',
          letterSpacing: '0.02em',
          marginBottom: 14,
        }}
      >
        RECOMMENDED
      </span>

      <Button
        className="phantom-button metaplex-button"
        onClick={() => {
          console.log(phatomWallet.name);
          select(phatomWallet.name);
          close();
        }}
      >
        <img src={phatomWallet?.icon} style={{ width: '1.2rem' }} />
        &nbsp;Connect to Phantom
      </Button>
      <Collapse
        ghost
        expandIcon={panelProps =>
          panelProps.isActive ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 7.5L10 12.5L5 7.5"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          )
        }
      >
        <Panel
          header={
            <span
              style={{
                fontWeight: 600,
                fontSize: '16px',
                lineHeight: '16px',
                letterSpacing: '-0.01em',
                color: 'rgba(255, 255, 255, 255)',
              }}
            >
              Other Wallets
            </span>
          }
          key="1"
        >
          {wallets.map((wallet, idx) => {
            if (wallet.name === 'Phantom') return null;

            return (
              <Button
                key={idx}
                className="metaplex-button w100"
                style={{
                  marginBottom: 5,
                }}
                onClick={() => {
                  select(wallet.name);
                  close();
                }}
              >
                Connect to {wallet.name}
              </Button>
            );
          })}
        </Panel>
      </Collapse>
    </MetaplexModal>
  );
};

export const WalletModalProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { publicKey } = useWallet();
  const [connected, setConnected] = useState(!!publicKey);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (publicKey) {
      const base58 = publicKey.toBase58();
      const keyToDisplay =
        base58.length > 20
          ? `${base58.substring(0, 7)}.....${base58.substring(
              base58.length - 7,
              base58.length,
            )}`
          : base58;

      notify({
        message: 'Wallet update',
        description: 'Connected to wallet ' + keyToDisplay,
      });
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey && connected) {
      notify({
        message: 'Wallet update',
        description: 'Disconnected from wallet',
      });
    }
    setConnected(!!publicKey);
  }, [publicKey, connected, setConnected]);

  return (
    <WalletModalContext.Provider
      value={{
        visible,
        setVisible,
      }}
    >
      {children}
      <WalletModal />
    </WalletModalContext.Provider>
  );
};

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolflareWallet(),
      // getTorusWallet({
      //   options: {
      //     // @FIXME: this should be changed for Metaplex, and by each Metaplex storefront
      //     clientId:
      //       'BOM5Cl7PXgE9Ylq1Z1tqzhpydY0RVr8k90QQ85N7AKI5QGSrr9iDC-3rvmy0K_hF0JfpLMiXoDhta68JwcxS1LQ',
      //   },
      // }),
      getLedgerWallet(),
      getSolongWallet(),
      getMathWallet(),
      getSolletWallet(),
    ],
    [],
  );

  const onError = useCallback((error: WalletError) => {
    console.error(error);
    notify({
      message: 'Wallet error',
      description: error.message,
    });
  }, []);

  return (
    <BaseWalletProvider wallets={wallets} onError={onError} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </BaseWalletProvider>
  );
};

export type WalletSigner = Pick<
  WalletAdapter,
  'publicKey' | 'signTransaction' | 'signAllTransactions'
>;
