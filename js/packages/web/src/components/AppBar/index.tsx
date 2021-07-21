import React, { useMemo } from 'react';
import './index.less';
import { Link } from 'react-router-dom';
import { Button, Dropdown, Menu } from 'antd';
import { ConnectButton, CurrentUserBadge, useWallet } from '@oyster/common';
import { Notifications } from '../Notifications';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined } from '@ant-design/icons';
import { useMeta } from '../../contexts';

const getDefaultLinkActions = (connected: boolean) => {
  return [
    <Link to={`/artworks`}>
      <Button className="app-btn">{connected ? 'My Items' : 'Artworks'}</Button>
    </Link>,
    <Link to={`/artists`}>
      <Button className="app-btn">Creators</Button>
    </Link>,
    <Link to={`/artistAlley`}>
      <Button className="app-btn">Artist Alley</Button>
    </Link>,
  ];
};

const UserActions = () => {
  const { wallet } = useWallet();
  const { whitelistedCreatorsByCreator, store } = useMeta();
  const pubkey = wallet?.publicKey?.toBase58() || '';

  const canCreate = useMemo(() => {
    return (
      store &&
      store.info &&
      (store.info.public ||
        whitelistedCreatorsByCreator[pubkey]?.info?.activated)
    );
  }, [pubkey, whitelistedCreatorsByCreator, store]);

  return (
    <>
      {/* <Link to={`#`}>
        <Button className="app-btn">Bids</Button>
      </Link> */}
      {canCreate ? (
        <Link to={`/art/create`}>
          <Button className="app-btn">Create</Button>
        </Link>
      ) : null}
      <Link to={`/auction/create/0`}>
        <Button className="connector" type="primary">
          Sell
        </Button>
      </Link>
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
      {getDefaultLinkActions(connected)}
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
              {getDefaultLinkActions(connected).map((item, idx) => (
                <Menu.Item key={idx}>{item}</Menu.Item>
              ))}
            </Menu>
          }
        >
          <MenuOutlined style={{ fontSize: '1.4rem' }} />
        </Dropdown>
      </>
    );

  return <DefaultActions />;
};

export const LogoLink = () => {
  return (
    <Link to={`/`}>
      <img src={'/mcfarlane-logo.svg'} />
    </Link>
  );
};

export const AppBar = () => {
  const { connected } = useWallet();

  return (
    <>
      <div className="app-left">
        <LogoLink />
        &nbsp;&nbsp;&nbsp;
        <MetaplexMenu />
      </div>
      <div className="app-right">
        {!connected && <ConnectButton type="primary" />}
        {connected && (
          <>
            <UserActions />
            <Notifications />
            <CurrentUserBadge
              showBalance={false}
              showAddress={false}
              iconSize={24}
            />
          </>
        )}
      </div>
    </>
  );
};
