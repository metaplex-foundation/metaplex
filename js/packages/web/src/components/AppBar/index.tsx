import { ConnectButton, useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Menu, Row, Space } from 'antd';
import React, { useMemo } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { Cog, CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';

export const AppBar = () => {
  const { connected, publicKey } = useWallet();
  const location = useLocation();
  const locationPath = location.pathname.toLowerCase();
  const { ownerAddress } = useStore();


  const menuInfo = useMemo(
    () => {
      let menu = [
        {
          key: 'listings',
          link: '/',
          alt: [{ path: '/auction', exact: false }],
          title: 'Listings',
          exact: false,
        },
        {
          key: 'artists',
          link: `/artists/${ownerAddress}`,
          alt: [{ path:'/artists', exact: false }],
          title: 'Artists',
          exact: false,
        },
      ]

      if (connected) {
        menu = [
          ...menu,
          {
            key: 'owned',
            link: '/owned',
            alt: [{ path: '/owned', exact: true }],
            title: 'Owned',
            exact: true,
          },
        ]
      }

      if (publicKey?.toBase58() === ownerAddress) {
        menu = [
          ...menu,
          {
            key: 'admin',
            link: '/admin',
            alt: [{ path: '/admin', exact: true }],
            title: 'Admin',
            exact: true,
          },
        ]
      }

      return menu;
    },
    [connected],
  );

  const menuItems = useMemo(
    () =>
      menuInfo.map(({ key, link, title }) => (
        <Menu.Item key={key}>
          <Link to={link}>{title}</Link>
        </Menu.Item>
      )),
    [menuInfo],
  );

  const activeItems = useMemo(
    () =>
      menuInfo
        .filter(({ link, alt, exact }) =>
          [{ path: link, exact }, ...alt].find(({ path, exact }) =>
            matchPath(locationPath, { path, exact }),
          ),
        )
        .map(({ key }) => key),
    [locationPath, menuInfo],
  );

  return (
    <>
      <Row>
        <Col flex="0 0 auto">
          <Link to="/" id="metaplex-header-logo">
            <img src="/metaplex-logo.svg" />
          </Link>
        </Col>
        <Col flex="1 0 auto">
          <Menu theme="dark" mode="horizontal" selectedKeys={activeItems}>
            {menuItems}
          </Menu>
        </Col>
        <Col flex="1" />
        <Col flex="0 1 auto">
          <Space align="center">
            {connected ? (
              <>
                <CurrentUserBadge />
                <Notifications />
                <Cog />
              </>
            ) : (
              <>
                <HowToBuyModal />
                <ConnectButton allowWalletChange />
              </>
            )}
          </Space>
        </Col>
      </Row>
    </>
  );
};
