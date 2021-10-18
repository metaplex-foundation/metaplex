import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Menu, Modal } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import { Notifications } from '../Notifications';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined } from '@ant-design/icons';
import { HowToBuyModal } from '../HowToBuyModal';
import {
  Cog,
  CurrentUserBadge,
  CurrentUserBadgeMobile,
} from '../CurrentUserBadge';
import { ConnectButton } from '@oyster/common';

const getDefaultLinkActions = (connected: boolean) => {
  return [
    <Link to={`/`} key={'explore'}>
      <Button>Explore</Button>
    </Link>,
    <Link to={`/artworks`} key={'artwork'}>
      <Button>{connected ? 'My Items' : 'Artwork'}</Button>
    </Link>,
    <Link to={`/artists`} key={'artists'}>
      <Button>Creators</Button>
    </Link>,
  ];
};

const DefaultActions = ({ vertical = false }: { vertical?: boolean }) => {
  const { connected } = useWallet();
  return <div>{getDefaultLinkActions(connected)}</div>;
};

const MetaplexMenu = () => {
  const { width } = useWindowDimensions();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const { connected } = useWallet();

  if (width < 768)
    return (
      <>
        <Modal
          title={<img src={'/metaplex-logo.svg'} />}
          visible={isModalVisible}
          footer={null}
          closeIcon={
            <img
              onClick={() => setIsModalVisible(false)}
              src={'/modals/close.svg'}
            />
          }
        >
          <div>
            <Menu onClick={() => setIsModalVisible(false)}>
              {getDefaultLinkActions(connected).map((item, idx) => (
                <Menu.Item key={idx}>{item}</Menu.Item>
              ))}
            </Menu>
            <div>
              {!connected ? (
                <div>
                  <ConnectButton onClick={() => setIsModalVisible(false)} />
                  <HowToBuyModal onClick={() => setIsModalVisible(false)} />
                </div>
              ) : (
                <>
                  <CurrentUserBadgeMobile
                    showBalance={false}
                    showAddress={true}
                    iconSize={24}
                    closeModal={() => {
                      setIsModalVisible(false);
                    }}
                  />
                  <Notifications />
                  <Cog />
                </>
              )}
            </div>
          </div>
        </Modal>
        <MenuOutlined onClick={() => setIsModalVisible(true)} />
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
      <div>
        <LogoLink />
        <MetaplexMenu />
      </div>
      <div>
        <div>
          <LogoLink />
          &nbsp;&nbsp;&nbsp;
          <MetaplexMenu />
        </div>
        <div>
          {!connected && <HowToBuyModal />}
          {!connected && <ConnectButton allowWalletChange />}
          {connected && (
            <>
              <CurrentUserBadge
                showBalance={false}
                showAddress={true}
                iconSize={24}
              />
              <Notifications />
              <Cog />
            </>
          )}
        </div>
      </div>
    </>
  );
};
