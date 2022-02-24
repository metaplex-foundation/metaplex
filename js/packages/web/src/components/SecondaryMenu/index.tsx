import { ConnectButton } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import React from 'react';
import { CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';
import { Cog } from '../../components/CurrentUserBadge';

export const SecondaryMenu = () => {
  const { connected } = useWallet();

  return (
    <div className="secondary-menu">
      {connected ? (
        <>
          <Notifications buttonType="text" />
          <Cog buttonType="text" />
          <CurrentUserBadge showAddress={true} buttonType="text" />
        </>
      ) : (
        <>
          <HowToBuyModal buttonType="text" />
          <ConnectButton type="text" allowWalletChange={false} />
        </>
      )}
    </div>
  );
};
