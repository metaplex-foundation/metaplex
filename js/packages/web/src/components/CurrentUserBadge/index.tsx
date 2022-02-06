import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Button, Popover, Select } from 'antd';
import {
  ENDPOINTS,
  formatNumber,
  formatUSD,
  Identicon,
  MetaplexModal,
  Settings,
  shortenAddress,
  useConnectionConfig,
  useNativeAccount,
  useWalletModal,
  useQuerySearch,
  WRAPPED_SOL_MINT,
} from '@oyster/common';
import { useMeta, useSolPrice } from '../../contexts';
import { useTokenList } from '../../contexts/tokenList';
import { TokenCircle } from '../Custom';

('@solana/wallet-adapter-base');

const btnStyle: React.CSSProperties = {
  border: 'none',
  height: 40,
};

const UserActions = (props: { mobile?: boolean; onClick?: any }) => {
  const { wallet, publicKey } = useWallet();
  const { whitelistedCreatorsByCreator, store } = useMeta();
  const pubkey = publicKey?.toBase58() || '';

  const canCreate = useMemo(() => {
    return (
      store?.info?.public ||
      whitelistedCreatorsByCreator[pubkey]?.info?.activated
    );
  }, [pubkey, whitelistedCreatorsByCreator, store]);

  return (
    <>
      {store &&
        (props.mobile ? (
          <div className="actions-buttons actions-user">
            {canCreate && (
              <Link to={`/art/create`}>
                <Button
                  onClick={() => {
                    props.onClick ? props.onClick() : null;
                  }}
                  className="black-btn"
                >
                  Create
                </Button>
              </Link>
            )}
            <Link to={`/auction/create/0`}>
              <Button
                onClick={() => {
                  props.onClick ? props.onClick() : null;
                }}
                className="black-btn"
              >
                Sell
              </Button>
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
            }}
          >
            {canCreate && (
              <>
                <Link to={`/art/create`} style={{ width: '100%' }}>
                  <Button className="metaplex-button-default" style={btnStyle}>
                    Create
                  </Button>
                </Link>
                &nbsp;&nbsp;
              </>
            )}
            <Link to={`/auction/create/0`} style={{ width: '100%' }}>
              <Button className="metaplex-button-default" style={btnStyle}>
                Sell
              </Button>
            </Link>
          </div>
        ))}
    </>
  );
};

const AddFundsModal = (props: {
  showAddFundsModal: any;
  setShowAddFundsModal: any;
  balance: number;
  publicKey: PublicKey;
}) => {
  return (
    <MetaplexModal
      visible={props.showAddFundsModal}
      onCancel={() => props.setShowAddFundsModal(false)}
      title="Add Funds"
      bodyStyle={{
        alignItems: 'start',
      }}
    >
      <div style={{ maxWidth: '100%' }}>
        <p style={{ color: 'white' }}>
          We partner with <b>FTX</b> to make it simple to start purchasing
          digital collectibles.
        </p>
        <div
          style={{
            width: '100%',
            background: '#242424',
            borderRadius: 12,
            marginBottom: 10,
            height: 50,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            justifyContent: 'space-between',
            fontWeight: 700,
          }}
        >
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Balance</span>
          <span>
            {formatNumber.format(props.balance)}&nbsp;&nbsp;
            <span
              style={{
                borderRadius: '50%',
                background: 'black',
                display: 'inline-block',
                padding: '1px 4px 4px 4px',
                lineHeight: 1,
              }}
            >
              <img src="/sol.svg" width="10" />
            </span>{' '}
            SOL
          </span>
        </div>
        <p>
          If you have not used FTX Pay before, it may take a few moments to get
          set up.
        </p>
        <Button
          onClick={() => props.setShowAddFundsModal(false)}
          style={{
            background: '#454545',
            borderRadius: 14,
            width: '30%',
            padding: 10,
            height: 'auto',
          }}
        >
          Close
        </Button>
        <Button
          onClick={() => {
            window.open(
              `https://ftx.com/pay/request?coin=SOL&address=${props.publicKey?.toBase58()}&tag=&wallet=sol&memoIsRequired=false`,
              '_blank',
              'resizable,width=680,height=860',
            );
          }}
          style={{
            background: 'black',
            borderRadius: 14,
            width: '68%',
            marginLeft: '2%',
            padding: 10,
            height: 'auto',
            borderColor: 'black',
          }}
        >
          <div
            style={{
              display: 'flex',
              placeContent: 'center',
              justifyContent: 'center',
              alignContent: 'center',
              alignItems: 'center',
              fontSize: 16,
            }}
          >
            <span style={{ marginRight: 5 }}>Sign with</span>
            <img src="/ftxpay.png" width="80" />
          </div>
        </Button>
      </div>
    </MetaplexModal>
  );
};

export const CurrentUserBadge = (props: {
  showBalance?: boolean;
  showAddress?: boolean;
  iconSize?: number;
}) => {
  const { wallet, publicKey, disconnect } = useWallet();
  const { account } = useNativeAccount();
  const solPrice = useSolPrice();
  const [showAddFundsModal, setShowAddFundsModal] = useState<Boolean>(false);
  const tokenList = useTokenList();

  if (!wallet || !publicKey) {
    return null;
  }
  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL;
  const balanceInUSD = balance * solPrice;
  const solMintInfo = tokenList.tokenMap.get(WRAPPED_SOL_MINT.toString());
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
                  <TokenCircle
                    iconFile={solMintInfo ? solMintInfo.logoURI : ''}
                  />
                  &nbsp;
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
                    onClick={() => setShowAddFundsModal(true)}
                    style={btnStyle}
                  >
                    Add Funds
                  </Button>
                  &nbsp;&nbsp;
                  <Button
                    className="metaplex-button-default"
                    onClick={disconnect}
                    style={btnStyle}
                  >
                    Disconnect
                  </Button>
                </div>
                <UserActions />
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
      <AddFundsModal
        setShowAddFundsModal={setShowAddFundsModal}
        showAddFundsModal={showAddFundsModal}
        publicKey={publicKey}
        balance={balance}
      />
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
              onSelect={network => {
                // Reload the page, forward user selection to the URL querystring.
                // The app will be re-initialized with the correct network
                // (which will also be saved to local storage for future visits)
                // for all its lifecycle.

                // Because we use react-router's HashRouter, we must append
                // the query parameters to the window location's hash & reload
                // explicitly. We cannot update the window location's search
                // property the standard way, see examples below.

                // doesn't work: https://localhost/?network=devnet#/
                // works: https://localhost/#/?network=devnet
                const windowHash = window.location.hash;
                routerSearchParams.set('network', network);
                const nextLocationHash = `${
                  windowHash.split('?')[0]
                }?${routerSearchParams.toString()}`;
                window.location.hash = nextLocationHash;
                window.location.reload();
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
                <Select.Option value={name} key={endpoint.name}>
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
          <img src="/cog.svg" />
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

  const [showAddFundsModal, setShowAddFundsModal] = useState<Boolean>(false);

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
          <span className="sol-img-wrapper">
            <img src="/sol.svg" width="10" />
          </span>{' '}
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
        <Button
          className="secondary-btn"
          onClick={() => {
            props.closeModal ? props.closeModal() : null;
            setShowAddFundsModal(true);
          }}
        >
          Add Funds
        </Button>
        &nbsp;&nbsp;
        <Button className="black-btn" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
      <div className="actions-buttons">
        <UserActions
          mobile
          onClick={() => {
            props.closeModal ? props.closeModal() : null;
          }}
        />
      </div>
      <AddFundsModal
        setShowAddFundsModal={setShowAddFundsModal}
        showAddFundsModal={showAddFundsModal}
        publicKey={publicKey}
        balance={balance}
      />
    </div>
  );
};
