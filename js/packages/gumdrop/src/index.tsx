import React from 'react';
import ReactDOM from 'react-dom';

import {
  AccountsProvider,
  WalletProvider,
  ConnectionProvider,
  ColorModeContextProvider,
} from './contexts';

import 'antd/dist/antd.css';
import '@fontsource/open-sans';
import '@fontsource/roboto';
import '@fontsource/sora';

import App from './App';
import reportWebVitals from './reportWebVitals';

import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <ConnectionProvider>
      <WalletProvider>
        <AccountsProvider>
          <ColorModeContextProvider>
            <App />
          </ColorModeContextProvider>
        </AccountsProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);

reportWebVitals();
