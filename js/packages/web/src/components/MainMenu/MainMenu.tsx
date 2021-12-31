import { useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import React from 'react';
import { Link, useMatch, useLocation } from 'react-router-dom';

export const MainMenu = () => {
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
  );
};
