import { useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import React from 'react';
import { Link, useResolvedPath, useMatch } from 'react-router-dom';
import cx from 'classnames';
import { SecondaryMenu } from '../SecondaryMenu';

export const AppBar = () => {
  const { connected, publicKey } = useWallet();
  const { ownerAddress, storefront } = useStore();
  const logo = storefront?.theme?.logo || '';

  const getMenuItem = (key: string, linkAppend?: string, title?: string) => {
    return {
      key,
      title: title || key[0].toUpperCase() + key.substring(1),
      link: `/${key + (linkAppend ? linkAppend : '')}`,
      group: `/${key}`,
    };
  };

  let menu = [
    getMenuItem('listings', '?view=live'),
    getMenuItem('creators', `/${ownerAddress}`),
  ];

  if (connected) {
    menu = [...menu, getMenuItem('owned')];
  }

  if (publicKey?.toBase58() === ownerAddress) {
    menu = [...menu, getMenuItem('admin')];
  }

  interface MenuItemProps {
    to: string;
    itemKey: string;
    group?: string;
    title: string;
  }

  const MenuItem = ({ to, title, itemKey, group }: MenuItemProps) => {
    const resolved = useResolvedPath(group || to);
    const match = useMatch({ path: resolved.pathname, end: false });

    return (
      <Link
        to={to}
        key={itemKey}
        className={cx('main-menu-item', {
          active: match,
        })}
      >
        {title}
      </Link>
    );
  };

  return (
    <div className="outer-wrapper">
      <div className="app-bar-wrapper">
        <div className="app-bar-left-wrapper">
          <Link
            to="/"
            className={cx('app-bar-logo-wrapper', {
              hide: useMatch('listings'),
            })}
          >
            <img src={logo || ''} className="app-bar-logo" />
          </Link>
          <div className="main-menu-wrapper">
            {menu.map(({ key, title, link, group }) => (
              <MenuItem
                to={link}
                key={key}
                itemKey={key}
                group={group}
                title={title}
              />
            ))}
          </div>
        </div>
        <SecondaryMenu />
      </div>
    </div>
  );
};
