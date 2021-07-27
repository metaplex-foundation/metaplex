import React from 'react';
import { Button, Select, Tooltip } from 'antd';
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
        padding: "15px 0",
      }}>
        <Identicon
          address={wallet?.publicKey?.toBase58()}
          style={{
            width: 48,
          }}
        />
        {wallet?.publicKey && <>
          <Tooltip title="Address copied">
            <div style={{
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#FFFFFF"
            }}
            onClick={() =>
              navigator.clipboard.writeText(
                wallet.publicKey?.toBase58() || '',
              )
            }>
              <CopyOutlined />&nbsp;{shortenAddress(wallet.publicKey?.toBase58())}
            </div>
          </Tooltip>

          <Link to={`/profile/${wallet.publicKey?.toBase58()}`} style={{
            color: "rgba(255, 255, 255, 0.7)",
          }}>View profile</Link>
        </>}
        <br />
        <span style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          width: "calc(100% + 32px)",
          marginBottom: 10,
        }}></span>
        {/* <span style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          justifyContent: "space-between",
          margin: "5px 0",
        }}>Network:<Select
          onSelect={setEndpoint}
          value={endpoint}
        >
          {ENDPOINTS.map(({ name, endpoint }) => (
            <Select.Option value={endpoint} key={endpoint}>
              {name}
            </Select.Option>
          ))}
        </Select></span> */}
        {/* {connected && (
          <>
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
