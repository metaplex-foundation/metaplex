import React from 'react';
import {NavLink} from 'react-router-dom';
// import './side-menu.less';

export const SideMenu = ({menuOut, setMenuOut, width}: {[key:string]: any}) => {
    return (
        <div
        className="side-menu"
          style={{
            transform: `translateX(${menuOut ? '0' : '-120%'})`,
          }}
        >
          <div
            style={{
              margin: '120px 2rem',
              display: 'grid',
              gridTemplateRows: 'repeat(4, 1fr)',
              gridGap: '1rem',
            }}
          >
            <NavLink
              exact={true}
              activeStyle={{ borderBottom: '1px solid #282828' }}
              className="menu-item"
              onClick={() => setMenuOut(false)}
              to="/"
            >
              Treehouse
            </NavLink>
            <NavLink
              exact={true}
              activeStyle={{ borderBottom: '1px solid #282828' }}
              className="menu-item"
              onClick={() => setMenuOut(false)}
              to="/preview"
            >
              Preview
            </NavLink>
            <NavLink
              activeStyle={{ borderBottom: '1px solid #282828' }}
              className="menu-item"
              onClick={() => setMenuOut(false)}
              to="/my-apes"
            >
              My Apes
            </NavLink>
            <NavLink
              activeStyle={{ borderBottom: '1px solid #282828' }}
              className="menu-item"
              onClick={() => setMenuOut(false)}
              to="/auctions"
            >
              Market
            </NavLink>
            <NavLink
              activeStyle={{ borderBottom: '1px solid #282828' }}
              className="menu-item"
              onClick={() => setMenuOut(false)}
              to="/roadmap"
            >
              Roadmap
            </NavLink>
            <NavLink
              activeStyle={{ borderBottom: '1px solid #282828' }}
              className="menu-item"
              onClick={() => setMenuOut(false)}
              to="/about"
            >
              About
            </NavLink>
          </div>

          <div style={{ margin: 'auto 2rem 2rem', display: 'flex' }}>
            <a
              className="dark"
              style={{ marginRight: '2rem' }}
              href="https://discord.gg/apeshit"
              target="_blank"
            >
              <i style={{ fontSize: '1.75rem' }} className="fab fa-discord"></i>
            </a>
            <a  
              className="dark"
              href="https://twitter.com/ApeShitSocial" target="_blank">
              <i style={{ fontSize: '1.75rem' }} className="fab fa-twitter"></i>
            </a>
          </div>
        </div>
    )
}