import React, { useMemo } from 'react';
import { ConnectButton, CurrentUserBadge, useWallet } from '@oyster/common';
import { Row, Col, Spin } from 'antd';
import useWindowDimensions from '../../utils/layout';
import { MenuOutlined } from '@ant-design/icons';

import { ApeshitMenu } from '../Menu';
import { useMeta } from '../../contexts';
import { NavLink } from 'react-router-dom';
import { Notifications } from '../Notifications';

const LOGO = '/img/logo_sm.png';
const logo = <NavLink to="/"><img className="logo" src={LOGO} alt="ApeShitSocial Logo" /></NavLink>;
export const AppBar = ({ setMenuOut, menuOut }: { setMenuOut: any, menuOut: any }) => {
  const { connected } = useWallet();
  const { isLoading } = useMeta();
  const { width } = useWindowDimensions();
  
  return (
    <div className="app-bar-container">
      <Row>
        <Col span={width > 768 ? 4 : 8} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {width > 768 && logo}
          {width <= 768 && (
            <div className="menu-button">
              <MenuOutlined className="burger" onClick={() => setMenuOut(!menuOut)} />
            </div>
          )}
        </Col>
        <Col span={width > 768 ? 16 : 8} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {width > 768 && <ApeshitMenu />}
          {width <= 768 && logo}

        </Col>
        <Col style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}} span={width > 768 ? 4 : 8}>
          <Notifications />
          <div style={{marginLeft: '2rem' ,display: 'flex', justifyContent: width > 768 ? 'center' : 'flex-end', alignItems: 'center', height: '100%' }}>
            {connected && <CurrentUserBadge
              showBalance={false}
              showAddress={true}
              iconSize={24}
            />}
            {isLoading && <span style={{width: 69, display: 'flex', justifyContent: 'center', alignItems: 'center'}}><Spin/></span>}
            {(!connected && !isLoading && <ConnectButton size="small">
              Connect
          </ConnectButton>)}
          </div>
        </Col>
      </Row>
    </div>
  )
};
