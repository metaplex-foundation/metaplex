import { ConnectButton } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Menu, Row, Space } from 'antd';
import React, { useMemo } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { Cog, CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';

export const AppBar = () => {
  const { connected } = useWallet();
  const location = useLocation();
  const locationPath = location.pathname.toLowerCase();

  const menuInfo = useMemo(
    () => [
      {
        key: 'explore',
        link: '/',
        alt: [{ path: '/auction', exact: false }],
        title: 'Explore',
        exact: true,
      },
      {
        key: 'art',
        link: '/artworks',
        alt: [{ path: '/art', exact: false }],
        title: connected ? 'My Items' : 'Artworks',
        exact: false,
      },
      {
        key: 'artists',
        link: '/artists',
        alt: [],
        title: 'Artists',
        exact: false,
      },
    ],
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
