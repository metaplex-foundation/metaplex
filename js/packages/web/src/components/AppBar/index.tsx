import { ConnectButton, useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Row } from 'antd';
import React from 'react';
import { Link, useMatch, useLocation } from 'react-router-dom';
import { Cog, CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';

type P = {
  logo: string;
};

export const AppBar = (props: P) => {
  const { connected, publicKey } = useWallet();
  const { ownerAddress } = useStore();

  let menu = [
    {
      key: 'auctions',
      title: 'Listings',
      link: '/listings?views=live',
    },
    {
      key: 'creators',
      title: 'Creators',
      link: `/creators/${ownerAddress}`,
      isMatch: useMatch('/creators/:item'),
    },
  ];

  if (connected) {
    menu = [
      ...menu,
      {
        key: 'owned',
        title: 'Owned',
        link: '/owned',
      },
    ];
  }

  if (publicKey?.toBase58() === ownerAddress) {
    menu = [
      ...menu,
      {
        key: 'admin',
        title: 'Admin',
        link: '/admin',
      },
    ];
  }

  return (
    <Row wrap={false} align="middle">
      <nav>
        <Link to="/" id="metaplex-header-logo">
          <img src={props.logo} />
        </Link>
        <div className="nav-right">
          <div className="nav-menu-wrapper">
            {menu.map(({ key, link, title, isMatch }) => {
              return (
                <Link
                  to={link}
                  key={key}
                  className={
                    'nav-menu-item' +
                    (isMatch || link.startsWith(useLocation().pathname)
                      ? ' active'
                      : '')
                  }
                >
                  {title}
                </Link>
              );
            })}
          </div>

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
        </div>
      </nav>
    </Row>
  );
};
