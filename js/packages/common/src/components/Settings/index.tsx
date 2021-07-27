import React from 'react';
import { Tooltip } from 'antd';
import { useWallet } from '../../contexts/wallet';
import { shortenAddress } from '../../utils';
import { CopyOutlined } from '@ant-design/icons';
import { Identicon } from '../Identicon';
import { Link } from 'react-router-dom';

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { wallet } = useWallet();

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
        {additionalSettings}
      </div>
    </>
  );
};
