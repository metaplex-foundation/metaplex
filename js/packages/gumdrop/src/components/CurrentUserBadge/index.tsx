import React, { useCallback, useEffect, useRef } from 'react';

import { useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Button, Popover, Select, Tooltip } from 'antd';
import Jazzicon from 'jazzicon';
import { CopyOutlined } from '@ant-design/icons';
import bs58 from 'bs58';

import cogSvg from './cog.svg';
import {
  ENDPOINTS,
  useConnectionConfig,
} from '../../contexts/ConnectionContext';
import { useWalletModal } from '../../contexts/WalletContext';
import { useSolPrice } from '../../contexts/coingecko';
import { useNativeAccount } from '../../contexts/accounts';
import {
  formatNumber,
  formatUSD,
  shortenAddress,
} from '../../utils/common';
import { useQuerySearch } from '../../hooks/useQuerySearch';

export const Identicon = (props: {
  address?: string | PublicKey;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
}) => {
  const { style, className, alt } = props;
  const address =
    typeof props.address === 'string'
      ? props.address
      : props.address?.toBase58();
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (address && ref.current) {
      try {
        ref.current.innerHTML = '';
        ref.current.className = className || '';
        ref.current.appendChild(
          Jazzicon(
            style?.width || 16,
            parseInt(bs58.decode(address).toString('hex').slice(5, 15), 16),
          ),
        );
      } catch (err) {
        // TODO
      }
    }
  }, [address, style, className]);

  return (
    <div
      className="identicon-wrapper"
      title={alt}
      ref={ref as any}
      style={props.style}
    />
  );
};

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { publicKey } = useWallet();

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '15px',
        }}
      >
        <Identicon
          address={publicKey?.toBase58()}
          style={{
            width: 48,
          }}
        />
        {publicKey && (
          <>
            <Tooltip title="Copy address">
              <div
                style={{
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}
                onClick={() =>
                  navigator.clipboard.writeText(publicKey?.toBase58() || '')
                }
              >
                <CopyOutlined />
                &nbsp;{shortenAddress(publicKey?.toBase58())}
              </div>
            </Tooltip>
          </>
        )}
        <br />
        <span
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            width: 'calc(100% + 32px)',
            marginTop: 10,
            marginBottom: 10,
          }}
        ></span>
        {additionalSettings}
      </div>
    </>
  );
};

const btnStyle: React.CSSProperties = {
  border: 'none',
  height: 40,
};

export const CurrentUserBadge = (props: {
  showBalance?: boolean;
  showAddress?: boolean;
  iconSize?: number;
}) => {
  const { wallet, publicKey, disconnect } = useWallet();
  const { account } = useNativeAccount();
  const solPrice = useSolPrice();

  if (!wallet || !publicKey) {
    return null;
  }
  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL;
  const balanceInUSD = balance * solPrice;
  const iconStyle: React.CSSProperties = {
    display: 'flex',
    width: props.iconSize,
    borderRadius: 50,
  };

  let name = props.showAddress ? shortenAddress(`${publicKey}`) : '';
  const unknownWallet = wallet as any;
  if (unknownWallet.name && !props.showAddress) {
    name = unknownWallet.name;
  }

  let image = <Identicon address={publicKey?.toBase58()} style={iconStyle} />;

  if (unknownWallet.image) {
    image = <img src={unknownWallet.image} style={iconStyle} />;
  }

  return (
    <div className="wallet-wrapper">
      {props.showBalance && (
        <span>
          {formatNumber.format((account?.lamports || 0) / LAMPORTS_PER_SOL)} SOL
        </span>
      )}

      <Popover
        trigger="click"
        placement="bottomRight"
        content={
          <Settings
            additionalSettings={
              <div
                style={{
                  width: 250,
                  paddingLeft: '10px',
                }}
              >
                <h5
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    letterSpacing: '0.02em',
                  }}
                >
                  BALANCE
                </h5>
                <div
                  style={{
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#FFFFFF',
                    }}
                  >
                    {formatNumber.format(balance)} SOL
                  </span>
                  &nbsp;
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    {formatUSD.format(balanceInUSD)}
                  </span>
                  &nbsp;
                </div>
                <div
                  style={{
                    display: 'flex',
                    marginBottom: 10,
                  }}
                >
                  <Button
                    className="metaplex-button-default"
                    onClick={disconnect}
                    style={{
                      ...btnStyle,
                      paddingLeft: 0,
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            }
          />
        }
      >
        <Button className="wallet-key">
          {image}
          {name && (
            <span
              style={{
                marginLeft: '0.5rem',
                fontWeight: 600,
              }}
            >
              {name}
            </span>
          )}
        </Button>
      </Popover>
    </div>
  );
};

export const Cog = () => {
  const { endpoint } = useConnectionConfig();
  const routerSearchParams = useQuerySearch();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);

  return (
    <div className="wallet-wrapper">
      <Popover
        trigger="click"
        placement="bottomRight"
        content={
          <div
            style={{
              width: 250,
            }}
          >
            <h5
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                letterSpacing: '0.02em',
              }}
            >
              NETWORK
            </h5>
            <Select
              onSelect={(network: string) => {
                // Reload the page, forward user selection to the URL querystring.
                // The app will be re-initialized with the correct network
                // (which will also be saved to local storage for future visits)
                // for all its lifecycle.
                routerSearchParams.set('network', network as any);
                console.log(`Set window search to ${network} ${routerSearchParams.toString()}: ${window.location.search}`);
                window.location.search = `?${routerSearchParams.toString()}`;
              }}
              value={endpoint.name}
              bordered={false}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
                width: '100%',
                marginBottom: 10,
              }}
            >
              {ENDPOINTS.map(({ name }) => (
                <Select.Option value={name} key={name}>
                  {name}
                </Select.Option>
              ))}
            </Select>

            <Button
              className="metaplex-button-default"
              style={btnStyle}
              onClick={open}
            >
              Change wallet
            </Button>
          </div>
        }
      >
        <Button className="wallet-key">
          <img src={cogSvg} />
        </Button>
      </Popover>
    </div>
  );
};

export const CurrentUserBadgeMobile = (props: {
  showBalance?: boolean;
  showAddress?: boolean;
  iconSize?: number;
  closeModal?: any;
}) => {
  const { wallet, publicKey, disconnect } = useWallet();
  const { account } = useNativeAccount();
  const solPrice = useSolPrice();

  if (!wallet || !publicKey) {
    return null;
  }
  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL;
  const balanceInUSD = balance * solPrice;

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    width: props.iconSize,
    borderRadius: 50,
  };

  let name = props.showAddress ? shortenAddress(`${publicKey}`) : '';
  const unknownWallet = wallet as any;
  if (unknownWallet.name && !props.showAddress) {
    name = unknownWallet.name;
  }

  let image = <Identicon address={publicKey?.toBase58()} style={iconStyle} />;

  if (unknownWallet.image) {
    image = <img src={unknownWallet.image} style={iconStyle} />;
  }

  return (
    <div className="current-user-mobile-badge">
      <div className="mobile-badge">
        {image}
        {name && (
          <span
            style={{
              marginLeft: '0.5rem',
              fontWeight: 600,
            }}
          >
            {name}
          </span>
        )}
      </div>
      <div className="balance-container">
        <span className="balance-title">Balance</span>
        <span>
          {formatNumber.format(balance)}&nbsp;&nbsp; SOL{' '}
          <span
            style={{
              marginLeft: 5,
              fontWeight: 'normal',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            {formatUSD.format(balanceInUSD)}
          </span>
        </span>
      </div>
      <div className="actions-buttons">
        <Button className="black-btn" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    </div>
  );
};
