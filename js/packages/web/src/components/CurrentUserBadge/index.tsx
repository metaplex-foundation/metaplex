import React from 'react';

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatUSD, Identicon, useWallet, useNativeAccount, formatNumber, shortenAddress, Settings } from '@oyster/common';
import './styles.less';
import { Popover, Button } from 'antd';
import { useSolPrice } from '../../contexts';

export const CurrentUserBadge = (props: { showBalance?: boolean, showAddress?: boolean, iconSize?: number }) => {
  const { wallet, disconnect } = useWallet();
  const { account } = useNativeAccount();
  const solPrice = useSolPrice();

  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL;
  const balanceInUSD = balance * solPrice;

  if (!wallet || !wallet.publicKey) return null

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    width: props.iconSize,
    borderRadius: 50,
  }
  const btnStyle: React.CSSProperties = {
    border: "none",
    height: 40,
  }

  const baseWalletKey: React.CSSProperties = { height: props.iconSize, cursor: 'pointer', userSelect: 'none' };
  const walletKeyStyle: React.CSSProperties = props.showAddress ?
    baseWalletKey
    : { ...baseWalletKey, paddingLeft: 0 };

  let name = props.showAddress ? shortenAddress(`${wallet.publicKey}`) : '';
  const unknownWallet = wallet as any;
  if (unknownWallet.name) {
    name = unknownWallet.name;
  }

  let image = <Identicon
    address={wallet.publicKey?.toBase58()}
    style={iconStyle}
  />;

  if (unknownWallet.image) {
    image = <img src={unknownWallet.image} style={iconStyle} />;
  }
  console.log("ADSFAFD", balance, balanceInUSD)

  return (
    <div className="wallet-wrapper">
      {props.showBalance && <span>
        {formatNumber.format((account?.lamports || 0) / LAMPORTS_PER_SOL)} SOL
      </span>}

      <Popover
        placement="bottomRight"
        content={<Settings additionalSettings={<div style={{
          width: 250,
        }}>

          <h5 style={{
            color: "rgba(255, 255, 255, 0.7)",
            letterSpacing: "0.02em",
          }}>BALANCE</h5>
          <div style={{
            marginBottom: 10,
          }}>
            <span style={{
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "24px",
              padding: "5px",
              height: "20px",
              width: "22px",
              display: "inline-flex",
            }}><img src="/sol-circle.svg" /></span>&nbsp;
            <span style={{
              fontWeight: 600,
              color: "#FFFFFF",
            }}>{formatNumber.format(balance)} SOL</span>&nbsp;
            <span style={{
              color: "rgba(255, 255, 255, 0.5)",
            }}>{formatUSD.format(balanceInUSD)}</span>&nbsp;
          </div>
          <div style={{
            display: "flex",
          }}>
            <Button
              className="mcfarlane-button"
              onClick={() => console.log("Add funds")}
              style={btnStyle}
            >
              Add Funds
            </Button>&nbsp;&nbsp;
            <Button
              className="mcfarlane-button"
              onClick={disconnect}
              style={btnStyle}
            >
              Disconnect
            </Button>
          </div>

        </div>} />}
        trigger="click"
      >
        <div className="wallet-key" style={walletKeyStyle}>
          {image}
          {name && (<span style={{ marginLeft: '0.5rem' }}>{name}</span>)}
        </div>
      </Popover>
    </div>
  );
};
