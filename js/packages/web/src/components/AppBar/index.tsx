import { ConnectButton, useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Menu, Row, Space } from 'antd';
import React, { ReactElement } from 'react';
import { Link, useResolvedPath, useMatch } from 'react-router-dom';
import { Cog, CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';
import cx from 'classnames';
type P = {
  logo: string;
};

interface NavMenuItemProps {
  to: string;
  key: string;
  group?: string;
  children: string | ReactElement;
}

const NavMenuItem = ({ to, children, key, group }: NavMenuItemProps) => {
  const resolved = useResolvedPath(group || to);
  const match = useMatch({ path: resolved.pathname, end: false });

  return (
    <Menu.Item key={key} className={cx({ "ant-menu-item-selected": match })}>
      <Link to={to}>{children}</Link>
    </Menu.Item>
  )
}

export const AppBar = (props: P) => {
  const { connected, publicKey } = useWallet();
  const { ownerAddress } = useStore();

    let menu = [
      {
        key: 'auctions',
        title: 'Listings',
        link: '/listings?views=live',
      },
      {
        key: 'creators',
        title: 'Creators',
        link: `/creators/${ownerAddress}`,
        group: '/creators',
      },
    ];

    if (connected) {
      menu = [
        ...menu,
        {
          key: 'owned',
          title: 'Owned',
          link: '/owned',
        },
      ];
    }

    if (publicKey?.toBase58() === ownerAddress) {
      menu = [
        ...menu,
        {
          key: 'admin',
          title: 'Admin',
          link: '/admin',
        },
      ];
    }

  return (
    <>
      <Row wrap={false} align="middle">
        <Col flex="0 0 auto">
          <Link to="/" id="metaplex-header-logo">
            <img src={props.logo} />
          </Link>
        </Col>
        <Col flex="1 0 0">
          <Menu theme="dark" mode="horizontal" selectedKeys={[]}>
            {menu.map(({ key, link, title, group }) => {
                return (
                  <NavMenuItem to={link} key={key} group={group}>
                    {title}
                  </NavMenuItem>
                )
              })}
          </Menu>
        </Col>
        <Col flex="0 1 auto">
          <Space className="metaplex-display-flex" align="center">
            {connected ? (
              <>
                <CurrentUserBadge showAddress={true} buttonType="text" />
                <Notifications buttonType="text" />
                <Cog buttonType="text" />
              </>
            ) : (
              <>
                <HowToBuyModal buttonType="text" />
                <ConnectButton type="text" allowWalletChange={false} />
              </>
            )}
          </Space>
        </Col>
      </Row>
    </>
  );
};
