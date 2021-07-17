import React from 'react';
import './index.less';
import { CurrentUserBadge, useWallet } from '@oyster/common';
import { Link, NavLink } from 'react-router-dom';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined } from '@ant-design/icons';
import LOGO from './logo_sm.png';

export const AppBar = ({ setMenuOut, menuOut }: { setMenuOut: any, menuOut: any }) => {
  const { connected, wallet } = useWallet();
  const { width } = useWindowDimensions();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        maxWidth: 1000,
        width: '100%',
        margin: width >= 768 ? '0 auto' : '0 1rem',
        height: width >= 768 ? 64 : 80
      }}
    >

      <nav
        style={{
          width: '100%',
          letterSpacing: '4px',
          padding: '0 1rem',
          position: 'relative',
          display: 'flex',
          justifyContent: width >= 768 ? 'center' : 'space-between',
          alignItems: 'center'
        }}
      >

        {width < 768 && (
          <>
            <MenuOutlined onClick={() => setMenuOut(!menuOut)} style={{ fontSize: 32, zIndex: 6 }} />
            <img src={LOGO} style={{ height: 72, width: 'auto' }} alt="ApeShitSocial Logo" />
            <div style={{ width: 32 }}></div>
          </>
        )}
        {width >= 768 && (
          <>
            <NavLink
              exact={true}
              activeStyle={{ borderBottom: '1px solid white' }}
              style={{
                color: 'white',
                borderBottom: '1px solid transparent',
                lineHeight: '32px'
              }}
              to="/">
              Home
            </NavLink>
            <span style={{ margin: '0 1rem 0 0.5rem' }}>|</span>
            <NavLink
              activeStyle={{ borderBottom: '1px solid white' }}
              style={{
                color: 'white',
                borderBottom: '1px solid transparent',
                lineHeight: '32px'
              }}
              to="/treehouse">
              Treehouse
            </NavLink>
            <span style={{ margin: '0 1rem 0 0.5rem' }}>|</span>
            <NavLink
              activeStyle={{ borderBottom: '1px solid white' }}
              style={{
                color: 'white',
                borderBottom: '1px solid transparent',
                lineHeight: '32px'
              }}
              to="/roadmap">
              Roadmap
            </NavLink>
            <span style={{ margin: '0 1rem 0 0.5rem' }}>|</span>
            <NavLink
              activeStyle={{ borderBottom: '1px solid white' }}
              style={{
                color: 'white',
                borderBottom: '1px solid transparent',
                lineHeight: '32px'
              }}
              to="/about">
              About
            </NavLink>
          </>
        )}

        {connected && (
          <div
            className="app-bar-box app-bar-right"
            style={{
              position: 'absolute',
              right: '-230px',
              top: '50%',
              transform: 'translateY(-50%)',
              paddingRight: '1rem'
            }}
          >
            <CurrentUserBadge
              showBalance={false}
              showAddress={true}
              iconSize={24}
            />
          </div>
        )}
      </nav>
    </div>
  );
};
