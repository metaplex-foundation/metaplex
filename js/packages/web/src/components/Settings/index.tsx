import React from 'react';
import { Button, Select } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import { contexts, useQuerySearch } from '@oyster/common';

const { ENDPOINTS, useConnectionConfig } = contexts.Connection;

export const Settings = () => {
  const { connected, disconnect } = useWallet();
  const { endpoint } = useConnectionConfig();
  const routerSearchParams = useQuerySearch();

  return (
    <>
      <div style={{ display: 'grid' }}>
        Network:{' '}
        <Select
          onSelect={network => {
            // Reload the page, forward user selection to the URL querystring.
            // The app will be re-initialized with the correct network
            // (which will also be saved to local storage for future visits)
            // for all its lifecycle.

            // Because we use react-router's HashRouter, we must append
            // the query parameters to the window location's hash & reload
            // explicitly. We cannot update the window location's search
            // property the standard way, see examples below.

            // doesn't work: https://localhost/?network=devnet#/
            // works: https://localhost/#/?network=devnet
            const windowHash = window.location.hash;
            routerSearchParams.set('network', network);
            const nextLocationHash = `${
              windowHash.split('?')[0]
            }?${routerSearchParams.toString()}`;
            window.location.hash = nextLocationHash;
            window.location.reload();
          }}
          value={endpoint.name}
          style={{ marginBottom: 20 }}
        >
          {ENDPOINTS.map(({ name, label }) => (
            <Select.Option value={name} key={name}>
              {label}
            </Select.Option>
          ))}
        </Select>
        {connected && (
          <Button type="primary" onClick={disconnect}>
            Disconnect
          </Button>
        )}
      </div>
    </>
  );
};
