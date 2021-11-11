import React from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNativeAccount } from '../../contexts/accounts';
import { formatNumber } from '../../utils';
import { Popover } from 'antd';
import { Settings } from '../Settings';

export const CurrentUserBadge = (props: {
  showBalance?: boolean;
  showAddress?: boolean;
  iconSize?: number;
}) => {
  const { wallet, publicKey } = useWallet();
  const { account } = useNativeAccount();

  if (!wallet || !publicKey) {
    return null;
  }

  return (
    <div>
      {props.showBalance && (
        <span>
          {formatNumber.format((account?.lamports || 0) / LAMPORTS_PER_SOL)} SOL
        </span>
      )}

      <Popover
        placement="topRight"
        title="Settings"
        content={<Settings />}
        trigger="click"
      >
        <div>
          <span>{wallet.name}</span>
          <img src={wallet.icon} />
        </div>
      </Popover>
    </div>
  );
};
