import { WalletAdapter } from "@solana/wallet-base";

import Wallet from "@project-serum/sol-wallet-adapter";
import { Button, Collapse } from "antd";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { notify } from "./../utils/notifications";
import { useConnectionConfig } from "./connection";
import { useLocalStorageState } from "../utils/utils";
import { PhantomWalletAdapter } from "../wallet-adapters/phantom";
import { useLocation } from "react-router";
import { MetaplexModal } from "../components/MetaplexModal";

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

const { Panel } = Collapse;

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

  const select = useCallback(() => setIsModalVisible(true), []);
  const close = useCallback(() => {
    setIsModalVisible(false)
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
      <MetaplexModal
        title="Connect Wallet"
        visible={isModalVisible}
        onCancel={close}
      >

        <span style={{
          color: "rgba(255, 255, 255, 0.75)",
          fontSize: "14px",
          lineHeight: "14px",
          fontFamily: "GraphikWeb",
          letterSpacing: "0.02em",
          marginBottom: 14
        }}>RECOMMENDED</span>

        <Button
          className="phantom-button metaplex-button"
          onClick={() => {
            setProviderUrl(pp?.url);
            setAutoConnect(true);
            close();
          }}
          disabled={providerUrl === pp?.url}
        >
          <img src={pp?.icon} style={{ width: '1.2rem' }} />&nbsp;Connect to Phantom
        </Button>

        <Collapse ghost expandIcon={
          (panelProps) => panelProps.isActive ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 7.5L10 12.5L5 7.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          ) :(
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 5L12.5 10L7.5 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          )
        }>
          <Panel header={<span style={{
            fontWeight: 600,
            fontSize: "16px",
            lineHeight: "16px",
            letterSpacing: "-0.01em"
          }}>Other Wallets</span>} key="1">
            {WALLET_PROVIDERS.map((provider, idx) => {
              if (provider.url === providerUrl) return null
              if (provider.name === "Phantom") return null

              return (
                <Button
                  key={idx}
                  className="metaplex-button w100"
                  style={{
                    marginBottom: 5,
                  }}
                  disabled={providerUrl === provider.url}
                  onClick={() => {
                    setProviderUrl(provider.url);
                    setAutoConnect(true);
                    close();
                  }}
                >
                  Connect to {provider.name}
                </Button>
              )
            })}
          </Panel>
        </Collapse>

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
