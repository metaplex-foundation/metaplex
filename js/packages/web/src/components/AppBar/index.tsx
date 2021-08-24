import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Dropdown, Menu } from 'antd';
import { ConnectButton, useWallet } from '@oyster/common';
import { Notifications } from '../Notifications';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined } from '@ant-design/icons';
import { useMeta } from '../../contexts';
import { HowToBuyModal } from '../HowToBuyModal';
import { CurrentUserBadge, Cog } from '../CurrentUserBadge';

const getDefaultLinkActions = (connected: boolean) => {
  return [
    // <Link to={`/artwork`} key={'artwork'}>
    //   <Button className="app-btn">{connected ? 'My Items' : 'Artwork'}</Button>
    // </Link>,
    // <Link to={`/artists`} key={'artists'}>
    //   <Button className="app-btn">Creators</Button>
    // </Link>,
    // <Link to={`/artistAlley`} key={'artistalley'}>
    //   <Button className="app-btn">Artist Alley</Button>
    // </Link>,
  ];
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
      <img src={'/metaplex-logo.svg'} />
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
        {!connected && <HowToBuyModal buttonClassName="modal-button-default" />}
        {!connected && <ConnectButton style={{ height: 48 }} />}
        {connected && (
          <>
            <CurrentUserBadge showBalance={false} showAddress iconSize={24} />
            <Notifications />
            <Cog />
          </>
        )}
      </div>
    </>
  );
};
