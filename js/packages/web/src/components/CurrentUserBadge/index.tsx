import React from 'react';

import { Identicon } from '@oyster/common';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useWallet } from '@oyster/common';
import { useNativeAccount } from '@oyster/common';
import { formatNumber, shortenAddress } from '@oyster/common';
import './styles.less';
import { Popover, Button } from 'antd';
import { Settings } from '@oyster/common';
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

          <h6>BALANCE</h6>
          <div>
            <span><img src="/sol-circle.svg" /></span>
            <span>◎{formatNumber.format(balance)} SOL</span>
            <span>${balanceInUSD}</span>
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
