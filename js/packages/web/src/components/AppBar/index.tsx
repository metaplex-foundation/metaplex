import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Dropdown, Menu } from 'antd';
import { ConnectButton, CurrentUserBadge, useWallet } from '@oyster/common';
import { Notifications } from '../Notifications';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined } from '@ant-design/icons';
import { useMeta } from '../../contexts';

const menu = (
  <Menu>
    <Menu.Item>
      <Link to={`/art/create`}>
        <Button className="app-btn">Create Single</Button>
      </Link>
    </Menu.Item>

    <Menu.Item>
      <Link to={`/art/create-batch`}>
        <Button className="app-btn">Create Batch</Button>
      </Link>
    </Menu.Item>
  </Menu>
);

const UserActions = () => {
  const { wallet } = useWallet();
  const { whitelistedCreatorsByCreator, store } = useMeta();
  const pubkey = wallet?.publicKey?.toBase58() || '';

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
            <Button className="app-btn">Bids</Button>
          </Link> */}
          {canCreate ? (
            <Dropdown overlay={menu} placement="bottomLeft">
              <Button>Create</Button>
            </Dropdown>
          ) : null}
          {canCreate ? (
            <Link to={`/auction/create/0`}>
              <Button className="connector" type="primary">
                Sell
              </Button>
            </Link>
          ) : null}
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
      className="bungee-font"
    >
      <Link to={`/`}>
        <Button className="app-btn">NEST</Button>
      </Link>
      <Link to={`/about`}>
        <Button className="app-btn">ABOUT</Button>
      </Link>
      <Link to={`/roadmap`}>
        <Button className="app-btn">ROADMAP</Button>
      </Link>
      <Link to={`/faq`}>
        <Button className="app-btn">FAQ</Button>
      </Link>
      {/* <Link to={`/artworks`}>
        <Button className="app-btn">
          {connected ? 'My Items' : 'Artworks'}
        </Button>
      </Link> */}
      {/* <Link to={`/artists`}>
        <Button className="app-btn">Creators</Button>
      </Link> */}
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
          className="bungee-font-inline"
          overlay={
            <Menu>
              <Menu.Item>
                <Link to={`/`}>
                  <Button className="app-btn">NEST</Button>
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link to={`/about`}>
                  <Button className="app-btn">ABOUT</Button>
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link to={`/roadmap`}>
                  <Button className="app-btn">ROADMAP</Button>
                </Link>
              </Menu.Item>
              <Menu.Item>
                <Link to={`/faq`}>
                  <Button className="app-btn">FAQ</Button>
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

export const AppBar = () => {
  const { connected } = useWallet();

  return (
    <>
      <div className="app-left app-bar-box">
        {window.location.hash !== '#/analytics' && <Notifications />}
        <div className="divider" />
        <MetaplexMenu />
      </div>
      {!connected && <ConnectButton type="primary" />}
      {connected && (
        <div className="app-right app-bar-box">
          {/* <UserActions /> */}
          <CurrentUserBadge
            showBalance={false}
            showAddress={false}
            iconSize={24}
          />
        </div>
      )}
    </>
  );
};
