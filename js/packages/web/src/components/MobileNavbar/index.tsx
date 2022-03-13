import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import { Notifications } from '../Notifications';
import { LogoLink, MetaplexMenu } from '../AppBar';

export const MobileNavbar = () => {
  const { connected } = useWallet();

  return (
    <div id="mobile-navbar">
      <LogoLink />
      <div className="mobile-menu">
        {connected && <Notifications />}
        <MetaplexMenu />
      </div>
    </div>
  );
};
