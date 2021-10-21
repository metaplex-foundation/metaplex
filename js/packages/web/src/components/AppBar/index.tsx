import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Dropdown, Menu, Select } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined, DownOutlined } from '@ant-design/icons';
import { useMeta } from '../../contexts';
import { Navbar, Container, Nav } from 'react-bootstrap';
import {
  ConnectButton,
  contexts,
  CurrentUserBadge,
  useWalletModal,
} from '@oyster/common';

import 'bootstrap/dist/css/bootstrap.css';

const MENU_ITEMS = [
  {
    label: 'NFT',
    href: '/',
    external: false,
  },
  {
    label: 'Collections',
    href: '/collections',
    external: false,
  },
  {
    label: 'Trade',
    href: 'https://dex.ninjaprotocol.io',
    external: true,
  },
  {
    label: 'Profile',
    href: '#',
    external: false,
  },
  {
    label: 'LeaderBoard',
    href: 'https://ninjaprotocol.io/leaderboard/',
    external: true,
  },
  {
    label: 'Help',
    href: 'https://docs.ninjaprotocol.io/guides',
    external: true,
  },
];

const UserActions = () => {
  const { publicKey } = useWallet();
  const { whitelistedCreatorsByCreator, store } = useMeta();
  const pubkey = publicKey?.toBase58() || '';

  const canCreate = useMemo(() => {
    return (
      store?.info?.public ||
      whitelistedCreatorsByCreator[pubkey]?.info?.activated
    );
  }, [pubkey, whitelistedCreatorsByCreator, store]);

  return (
    <>
      <Link to={`/artists`}>
        <Button className="app-btn">Creators</Button>
      </Link>
      {store && (
        <>
          {/* <Link to={`#`}>
            <Button className="app-btn">Bids</Button>
          </Link> */}
          {canCreate ? (
            <Link to={'/art/create/0'}>
              <Button className="app-btn">Mint</Button>
            </Link>
          ) : null}
          <Link to={'/auction/create/0'}>
            <Button className="connector" type="primary">
              Sell
            </Button>
          </Link>
        </>
      )}
    </>
  );
};

const DefaultActions = ({ vertical = false }: { vertical?: boolean }) => {
  const { connected } = useWallet();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
      }}
    >
      <Link to={`/`}>
        <Button className="app-btn">Auctions</Button>
      </Link>
      <Link to={`/artworks`}>
        <Button className="app-btn">
          {connected ? 'My Gallery' : 'Gallery'}
        </Button>
      </Link>
      <Link to={`/artists`}>
        <Button className="app-btn">Collections</Button>
      </Link>
    </div>
  );
};

const MetaplexMenu = () => {
  const { width } = useWindowDimensions();
  const { connected } = useWallet();

  if (width < 768)
    return (
      <>
        <Dropdown
          arrow
          placement="bottomLeft"
          trigger={['click']}
          overlay={
            <Menu>
              <Menu.Item>
                <Link to={`/`}>
                  <Button className="app-btn">Explore</Button>
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link to={`/artworks`}>
                  <Button className="app-btn">
                    {connected ? 'My Items' : 'Artworks'}
                  </Button>
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link to={`/artists`}>
                  <Button className="app-btn">Creators</Button>
                </Link>
              </Menu.Item>
            </Menu>
          }
        >
          <MenuOutlined style={{ fontSize: '1.4rem' }} />
        </Dropdown>
      </>
    );

  return <DefaultActions />;
};

const MenuItems = ({ label, href, external, active, handleMenuClick }) => {
  return external ? (
    <Nav.Link
      className={`navbar-item`}
      href={href}
      target="_blank"
      onClick={() => handleMenuClick(label)}
      active={active === label}
    >
      {label}
    </Nav.Link>
  ) : (
    <Link className="link" to={href}>
      <Nav.Item
        className={`navbar-item default nav-link ${
          active === label && 'active'
        }`}
        onClick={() => handleMenuClick(label)}
      >
        {label}
      </Nav.Item>
    </Link>
  );
};

export const AppBar = () => {
  const { wallet, connect, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);
  const [menuItem, setMenuItem] = useState('NFT');

  const handleClick = useCallback(
    () => (wallet ? connect().catch(() => {}) : open()),
    [wallet, connect, open],
  );

  const handleDisconnect = () => disconnect().catch();
  const { ENDPOINTS, useConnectionConfig } = contexts.Connection;
  const { endpoint, setEndpoint } = useConnectionConfig();

  const handleMenuClick = menuItem => {
    if (menuItem == 'NFT' || menuItem == 'Collections') setMenuItem(menuItem);
  };
  const location = useLocation();
  useEffect(() => {
    if (location.pathname == '/collections') handleMenuClick('Collections');
    else if (location.pathname == '/') {
      handleMenuClick('NFT');
    }
  }, [location]);

  return (
    <Navbar
      collapseOnSelect
      expand="lg"
      variant="dark"
      className="navbar-container"
    >
      <Container>
        <Link className="link" to="/">
          <Navbar.Brand className="d-flex align-items-center logo-section">
            <img
              src="/LOGO_SOL_NOBG.png"
              id="brand"
              alt="logo"
              className="mr-2"
            />
            <div>
              NINJAPLEX
              <div className="beta">Beta</div>
            </div>
          </Navbar.Brand>
        </Link>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="m-auto">
            {MENU_ITEMS.map(({ label, href, external }) => (
              <MenuItems
                key={label}
                label={label}
                href={href}
                external={external}
                active={menuItem}
                handleMenuClick={handleMenuClick}
              />
            ))}
          </Nav>
          <Nav
            className="ml-auto connectNavbar"
            style={{
              position: 'relative',
            }}
          >
            {connected ? (
              <div className="app-right app-bar-box">
                <UserActions />
                <CurrentUserBadge
                  showBalance={false}
                  showAddress={false}
                  iconSize={24}
                />
              </div>
            ) : (
              <ConnectButton type="primary" allowWalletChange />
            )}
            {/* <Select onSelect={setEndpoint} value={endpoint}>
              {ENDPOINTS.map(({ name, endpoint }) => (
                <Select.Option value={endpoint} key={endpoint}>
                  {name}
                </Select.Option>
              ))}
            </Select>
            <Navbar.Text>
              <button
                className="connect-btn"
                type="button"
                id="dropdownMenuButton"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
                onClick={connected ? handleDisconnect : handleClick}
              >
                <img src="/images/ion_wallet-outline.png" alt="wallet_icon" />
                {connected ? 'Disconnect' : 'Connect'}
                <DownOutlined />
              </button>
            </Navbar.Text> */}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
