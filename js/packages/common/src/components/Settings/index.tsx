import React from 'react';
import { Button, Select } from 'antd';
import { useWallet } from '../../contexts/wallet';
import { ENDPOINTS, useConnectionConfig } from '../../contexts/connection';
import { shortenAddress } from '../../utils';
import { CopyOutlined } from '@ant-design/icons';
import { Identicon } from '../Identicon';
import { Link } from 'react-router-dom';

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { connected, select, wallet } = useWallet();
  const { endpoint, setEndpoint } = useConnectionConfig();

  return (
    <>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <Identicon
          address={wallet?.publicKey?.toBase58()}
          style={{
            width: 48,
          }}
        />
        {wallet?.publicKey && <>
          <div>{shortenAddress(wallet.publicKey?.toBase58())}</div>
          <Link to={`/profile/${wallet.publicKey?.toBase58()}`}>View profile</Link>
        </>}
        <br />
        <span style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          width: "calc(100% + 32px)",
        }}></span>
        <span>Network: <Select
          onSelect={setEndpoint}
          value={endpoint}
          style={{ marginBottom: 20 }}
        >
          {ENDPOINTS.map(({ name, endpoint }) => (
            <Select.Option value={endpoint} key={endpoint}>
              {name}
            </Select.Option>
          ))}
        </Select></span>
        {/* {connected && (
          <>
            <span>Wallet:</span>
            {wallet?.publicKey && (
              <Button
                style={{ marginBottom: 5 }}
                onClick={() =>
                  navigator.clipboard.writeText(
                    wallet.publicKey?.toBase58() || '',
                  )
                }
              >
                <CopyOutlined />
                {shortenAddress(wallet?.publicKey.toBase58())}
              </Button>
            )}

            <Button onClick={select} style={{ marginBottom: 5 }}>
              Change
            </Button>
            <Button
              type="primary"
              onClick={disconnect}
              style={{ marginBottom: 5 }}
            >
              Disconnect
            </Button>
          </>
        )} */}
        {additionalSettings}
      </div>
    </>
  );
};
