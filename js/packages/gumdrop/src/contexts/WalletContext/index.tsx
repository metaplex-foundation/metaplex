import { WalletError } from "@solana/wallet-adapter-base";
import {
  useWallet,
  WalletProvider as BaseWalletProvider,
  WalletContextState,
} from "@solana/wallet-adapter-react";
import {
  getLedgerWallet,
  getMathWallet,
  getPhantomWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolongWallet,
} from "@solana/wallet-adapter-wallets";
import { Button } from "antd";
import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { notify } from "../../utils/common";
import { MetaplexModal } from "../../components/MetaplexModal";
import { CollapsePanel } from "../../components/CollapsePanel";

export interface WalletModalContextState {
  visible: boolean;
  setVisible: (open: boolean) => void;
}

export const WalletModalContext = createContext<WalletModalContextState>(
  {} as WalletModalContextState
);

export function useWalletModal(): WalletModalContextState {
  return useContext(WalletModalContext);
}

export const WalletModal: FC = () => {
  const { wallets, select } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const close = useCallback(() => {
    setVisible(false);
  }, [setVisible]);

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
      <CollapsePanel
        id="other-wallets"
        panelName="Other Wallets"
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
      </CollapsePanel>
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
              base58.length
            )}`
          : base58;

      notify({
        message: "Wallet update",
        description: "Connected to wallet " + keyToDisplay,
      });
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey && connected) {
      notify({
        message: "Wallet update",
        description: "Disconnected from wallet",
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
      getLedgerWallet(),
      getSolongWallet(),
      getMathWallet(),
      getSolletWallet(),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    console.error(error);
    notify({
      message: "Wallet error",
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
  WalletContextState,
  "publicKey" | "signTransaction" | "signAllTransactions" | "signMessage"
>;
