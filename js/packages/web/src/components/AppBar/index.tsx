import { ConnectButton } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Row } from 'antd';
import React from 'react';
import { Cog, CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';

export const AppBar = () => {
  const { connected } = useWallet();

  return (
    <Row wrap={false} align="middle">
      <nav>
        <div className="wallet-options">
          {connected ? (
            <>
              <CurrentUserBadge showAddress={true} buttonType="text" />
              <Notifications buttonType="text" />
              <Cog buttonType="text" />
            </>
          ) : (
            <>
              <HowToBuyModal buttonType="text" />
              <ConnectButton type="text" allowWalletChange={false} />
            </>
          )}
        </div>
      </nav>
    </Row>
  );
};
