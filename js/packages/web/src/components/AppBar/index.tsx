import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Dropdown, Menu } from 'antd';
import { ConnectButton, CurrentUserBadge, useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Notifications } from '../Notifications';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined } from '@ant-design/icons';
import { useMeta } from '../../contexts';

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
      {store && (
        <>
          {/* <Link to={`#`}>
            <Button>Bids</Button>
          </Link> */}
          {canCreate ? (
            <Link to={`/artworks/new`}>
              <Button>Create</Button>
            </Link>
          ) : null}
        </>
      )}
    </>
  );
};

const DefaultActions = ({ vertical = false, isStoreOwner, pathname }: { vertical?: boolean, isStoreOwner: boolean, pathname: string }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
      }}
    >
      <Link to="/">
        <Button type={pathname === "/" || pathname.includes('auction') ? "primary" : undefined}>Listings</Button>
      </Link>
      <Link
        to="/artworks">
        <Button
          type={pathname.includes('artworks') ? "primary" : undefined}
        >
          Artworks
        </Button>
      </Link>
      <Link
        to="/artists"
      >
        <Button
          type={pathname.includes('artists') ? "primary" : undefined}
        >Creators</Button>
      </Link>
      {isStoreOwner && (
        <Link to="/admin">
          <Button
            type={pathname === "/admin" ? "primary" : undefined}
          >Admin</Button>
        </Link>
      )}
    </div>
  );
};

const MetaplexMenu = () => {
  const { width } = useWindowDimensions();
  const { ownerAddress } = useStore()
  const wallet = useWallet();
  const isStoreOwner = ownerAddress == wallet.publicKey?.toBase58();
  const { pathname } = useLocation();

  if (width < 768)
    return (
      <>
        <Dropdown
          arrow
          placement="bottomLeft"
          trigger={['click']}
          overlay={
            <Menu activeKey="admin">
              <Menu.Item>
                <Link
                  type={pathname === "/" ? "primary" : undefined}
                  to={`/`}
                >
                  <Button>Listings</Button>
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link
                  type={pathname.includes('artworks') ? "primary" : undefined}
                  to={`/artworks`}
                >
                  <Button>
                    Artworks
                  </Button>
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link
                  type={pathname.includes('artists') ? "primary" : undefined}
                  to={`/artists`}
                >
                  <Button>Creators</Button>
                </Link>
              </Menu.Item>
              {isStoreOwner && (
                <Menu.Item
                  key="admin"
                >
                  <Link
                    to="/admin"
                  >
                    <Button >Admin</Button>
                  </Link>
                </Menu.Item>
              )}
            </Menu>
          }
        >
          <MenuOutlined style={{ fontSize: '1.4rem' }} />
        </Dropdown>
      </>
    );

  return <DefaultActions isStoreOwner={isStoreOwner} pathname={pathname} />;
};

export const AppBar = () => {
  const { connected } = useWallet();

  return (
    <>
      <div className="app-left app-bar-box">
        <Notifications />
        <div className="divider" />
        <MetaplexMenu />
      </div>
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
    </>
  );
};
