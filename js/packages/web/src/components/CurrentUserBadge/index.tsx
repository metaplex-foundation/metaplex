import React, { useMemo, useState } from 'react';

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  formatUSD,
  Identicon,
  useWallet,
  useNativeAccount,
  formatNumber,
  shortenAddress,
  Settings,
  MetaplexModal,
  ENDPOINTS,
  useConnectionConfig,
} from '@oyster/common';
import { Popover, Button, Select } from 'antd';
import { useSolPrice, useMeta } from '../../contexts';
import { Link } from 'react-router-dom';
import { SolCircle } from '../Custom';

const btnStyle: React.CSSProperties = {
  border: 'none',
  height: 40,
};

const UserActions = () => {
  const { wallet } = useWallet();
  const { whitelistedCreatorsByCreator, store } = useMeta();
  const pubkey = wallet?.publicKey?.toBase58() || '';

  const canCreate = useMemo(() => {
    return (
      store?.info?.public ||
      whitelistedCreatorsByCreator[pubkey]?.info?.activated
    );
  }, [pubkey, whitelistedCreatorsByCreator, store]);

  return (
    <>
      {store && (
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
      )}
    </>
  );
};

export const CurrentUserBadge = (props: {
  showBalance?: boolean;
  showAddress?: boolean;
  iconSize?: number;
}) => {
  const { wallet, disconnect } = useWallet();
  const { account } = useNativeAccount();
  const solPrice = useSolPrice();

  const [showAddFundsModal, setShowAddFundsModal] = useState<Boolean>(false);

  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL;
  const balanceInUSD = balance * solPrice;

  if (!wallet || !wallet.publicKey) return null;

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    width: props.iconSize,
    borderRadius: 50,
  };

  let name = props.showAddress ? shortenAddress(`${wallet.publicKey}`) : '';
  const unknownWallet = wallet as any;
  if (unknownWallet.name) {
    name = unknownWallet.name;
  }

  let image = (
    <Identicon address={wallet.publicKey?.toBase58()} style={iconStyle} />
  );

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
                  <SolCircle />
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

      <MetaplexModal
        visible={showAddFundsModal}
        onCancel={() => setShowAddFundsModal(false)}
        bodyStyle={{
          alignItems: 'start',
        }}
      >
        <div style={{ maxWidth: '100%' }}>
          <h2>Add funds</h2>
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
              {formatNumber.format(balance)}&nbsp;&nbsp;
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
            If you have not used FTX Pay before, it may take a few moments to
            get set up.
          </p>
          <Button
            onClick={() => setShowAddFundsModal(false)}
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
                `https://ftx.com/pay/request?coin=SOL&address=${wallet?.publicKey?.toBase58()}&tag=&wallet=sol&memoIsRequired=false`,
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
    </div>
  );
};

export const Cog = () => {
  const { endpoint, setEndpoint } = useConnectionConfig();
  const { select } = useWallet();

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
              onSelect={setEndpoint}
              value={endpoint}
              bordered={false}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
                width: '100%',
                marginBottom: 10,
              }}
            >
              {ENDPOINTS.map(({ name, endpoint }) => (
                <Select.Option value={endpoint} key={endpoint}>
                  {name}
                </Select.Option>
              ))}
            </Select>

            <Button
              className="metaplex-button-default"
              style={btnStyle}
              onClick={select}
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
