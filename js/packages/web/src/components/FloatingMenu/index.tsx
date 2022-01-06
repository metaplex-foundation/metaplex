import { ConnectButton } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import React from 'react';
import { CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';

export const FloatingMenu = () => {
  const { connected } = useWallet();

  return (
    <div className="floating-menu">
      {connected ? (
        <>
          <CurrentUserBadge showAddress={true} buttonType="text" />
          <Notifications buttonType="text" />
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
