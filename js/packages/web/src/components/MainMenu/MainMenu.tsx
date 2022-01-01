import { useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import React from 'react';
import { Link, useResolvedPath, useMatch } from 'react-router-dom';
import cx from 'classnames';

export const MainMenu = () => {
  const { connected, publicKey } = useWallet();
  const { ownerAddress } = useStore();

  const getMenuItem = (key: string, linkAppend?: string, title?: string) => {
    return {
      key,
      title: title || key[0].toUpperCase() + key.substring(1),
      link: `/${key + (linkAppend ? linkAppend : '')}`,
      group: `/${key}`,
    };
  };

  let menu = [
    getMenuItem('listings', '?views=live'),
    getMenuItem('creators', `/${ownerAddress}`),
  ];

  if (connected) {
    menu = [...menu, getMenuItem('owned')];
  }

  if (publicKey?.toBase58() === ownerAddress) {
    menu = [...menu, getMenuItem('admin')];
  }

  interface MainMenuItemProps {
    to: string;
    key: string;
    group?: string;
    title: string;
  }

  const MainMenuItem = ({ to, title, key, group }: MainMenuItemProps) => {
    const resolved = useResolvedPath(group || to);
    const match = useMatch({ path: resolved.pathname, end: false });

    return (
      <Link
        to={to}
        key={key}
        className={cx('main-menu-item', {
          active: match,
        })}
      >
        {title}
      </Link>
    );
  };

  return (
    <div className="main-menu-wrapper">
      {menu.map(({ key, title, link, group }) => (
        <MainMenuItem to={link} key={key} group={group} title={title} />
      ))}
    </div>
  );
};
