import React from 'react';
import {NavLink} from 'react-router-dom';

export const SideMenu = ({menuOut, setMenuOut, width}: {[key:string]: any}) => {
    return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: width,
            backgroundColor: '#99FF99',
            zIndex: 5,
            transform: `translateX(${menuOut ? '0' : '-120%'})`,
            transition: '0.2s transform ease',
            fontSize: '2rem',
            fontWeight: 'bold',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'rgba(0, 0, 0, 0.2) 0px 5px 10px 1px'
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
              style={{ color: '#282828', borderBottom: '1px solid transparent' }}
              onClick={() => setMenuOut(false)}
              to="/"
            >
              Treehouse
            </NavLink>
            <NavLink
              exact={true}
              activeStyle={{ borderBottom: '1px solid #282828' }}
              style={{ color: '#282828', borderBottom: '1px solid transparent' }}
              onClick={() => setMenuOut(false)}
              to="/preview"
            >
              Preview
            </NavLink>
            <NavLink
              activeStyle={{ borderBottom: '1px solid #282828' }}
              style={{ color: '#282828', borderBottom: '1px solid transparent' }}
              onClick={() => setMenuOut(false)}
              to="/roadmap"
            >
              Roadmap
            </NavLink>
            <NavLink
              activeStyle={{ borderBottom: '1px solid #282828' }}
              style={{ color: '#282828', borderBottom: '1px solid transparent' }}
              onClick={() => setMenuOut(false)}
              to="/about"
            >
              About
            </NavLink>
          </div>

          <div style={{ margin: 'auto 2rem 2rem', display: 'flex' }}>
            <a
              style={{ marginRight: '2rem', color: '#282828 !important' }}
              href="https://discord.gg/apeshit"
              target="_blank"
            >
              <i style={{ fontSize: '1.75rem' }} className="fab fa-discord"></i>
            </a>
            <a  style={{ color: '#282828 !important'}} href="https://twitter.com/ApeShitSocial" target="_blank">
              <i style={{ fontSize: '1.75rem' }} className="fab fa-twitter"></i>
            </a>
          </div>
        </div>
    )
}