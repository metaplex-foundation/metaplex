import React, { useCallback } from 'react';
import { Button, Select } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import { ENDPOINTS, useConnectionConfig } from '../../contexts/connection';
import { useWalletModal } from '../../contexts';
import { notify, shortenAddress } from '../../utils';
import { CopyOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useMeta } from '../../contexts';
import { admin } from '../../hooks';

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { connected, disconnect, publicKey } = useWallet();
  const { endpoint, setEndpoint } = useConnectionConfig();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);
  const { store } = useMeta();

  return (
    <>
      <div className="popover-dropdown">
        <div>
          <span className="span-title"> Network:{' '} </span>
          <Select
            onSelect={setEndpoint}
            value={endpoint}
            style={{ marginBottom: 20 }}
          >
            {ENDPOINTS.map(({ name, endpoint }) => (
              <Select.Option value={endpoint} key={endpoint}>
                {name}
              </Select.Option>
            ))}
          </Select>
        </div>
        {connected && (
          <>
            <div>
              <span className="span-title">Wallet:</span>
              {publicKey && (
                <Button
                  style={{ marginBottom: 5 }}
                  onClick={async () => {
                    if (publicKey) {
                      await navigator.clipboard.writeText(publicKey.toBase58());
                      notify({
                        message: 'Wallet update',
                        description: 'Address copied to clipboard',
                      });
                    }
                  }}
                >
                  <CopyOutlined />
                  {shortenAddress(publicKey.toBase58())}
                </Button>
              )}
            </div>
            {store && admin() && (
              <Link to={`/admin`}>
                <Button className="app-btn">Admin</Button>
              </Link>
            )}
            <Button onClick={open} style={{ marginBottom: 5 }}>
              Change
            </Button>
            <Button
              type="primary"
              onClick={() => disconnect().catch()}
              style={{ marginBottom: 5 }}
            >
              Disconnect
            </Button>
          </>
        )}
        {additionalSettings}
      </div>
    </>
  );
};
