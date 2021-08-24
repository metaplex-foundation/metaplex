import React from 'react';
import useWindowDimensions from '../../utils/layout';
import { Menu } from 'antd';
import { NavLink, useLocation } from 'react-router-dom';

const menuItems = [
  { label: 'Treehouse', link: '/' },
  { label: 'Preview', link: '/preview' },
  { label: 'My Apes', link: '/my-apes' },
  { label: 'Market', link: '/auctions' },
  { label: 'Roadmap', link: '/roadmap' },
  { label: 'About', link: '/about' },
]


export function ApeshitMenu() {
  const { width } = useWindowDimensions();
  const location = useLocation();
  const selected = [location.pathname];
  if (location.pathname.includes('/auction/')) {
    selected.push('/auctions')
  }

  return (
    <Menu 
      selectedKeys={selected} 
      mode={width <= 768 ? 'vertical' : 'horizontal'}
      style={{margin: '0 auto'}}
    >
      {menuItems.map((item) =>
        <Menu.Item key={item.link}>
          <NavLink to={item.link}>
            {item.label}
          </NavLink>
        </Menu.Item>
      )}
    </Menu>
  )
}