import { ConnectButton, useStore } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Menu, Row, Space } from 'antd';
import React, { ReactNode, useMemo } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { Cog, CurrentUserBadge } from '../CurrentUserBadge';
import { HowToBuyModal } from '../HowToBuyModal';
import { Notifications } from '../Notifications';
type P = {
  logo: string;
};

export const AppBar = (props: P) => {
  const { connected, publicKey } = useWallet();
  const location = useLocation();
  const locationPath = location.pathname.toLowerCase();
  const { ownerAddress } = useStore();

  // Array of menu item descriptions
  const menuInfo: {
    /** The React iterator key prop for this item */
    key: string;
    /** The content of this item */
    title: ReactNode;
    /**
     * The link target for this item.
     *
     * Any routes matching this link (and, if `exact` is false, any child
     * routes) will cause the menu item to appear highlighted.
     */
    link: string;
    /** Whether child routes should match against the value of `link` */
    exact: boolean;
    /**
     * Zero or more alternate routes to check against for highlighting this
     * item.
     *
     * The item will never link to these routes, but they will be queried for
     * highlighting similar to the `link` property.
     */
    alt: {
      /**
       * An alternate route path or prefix to match against.
       *
       * See the `link` property for more info.
       */
      path: string;
      /** Whether child routes should match against the value of `path` */
      exact: boolean;
    }[];
  }[] = useMemo(() => {
    let menu = [
      {
        key: 'listings',
        title: 'Listings',
        link: '/',
        exact: true,
        alt: [{ path: '/auction', exact: false }],
      },
      {
        key: 'artists',
        title: 'Artists',
        link: `/artists/${ownerAddress}`,
        exact: true,
        alt: [
          { path: '/artists', exact: false },
          { path: '/artworks', exact: false },
        ],
      },
    ];

    if (connected) {
      menu = [
        ...menu,
        {
          key: 'owned',
          title: 'Owned',
          link: '/owned',
          exact: true,
          alt: [],
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
          exact: true,
          alt: [],
        },
      ];
    }

    return menu;
  }, [connected]);

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
      <Row wrap={false} align="middle">
        <Col flex="0 0 auto">
          <Link to="/" id="metaplex-header-logo">
            <img src={props.logo} />
          </Link>
        </Col>
        <Col flex="1 0 0" style={{ overflow: 'hidden' }}>
          <Menu theme="dark" mode="horizontal" selectedKeys={activeItems}>
            {menuItems}
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
