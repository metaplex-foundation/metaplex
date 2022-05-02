import React from 'react';
import { Tooltip } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import { shortenAddress } from '../../utils';
import { CopyOutlined } from '@ant-design/icons';
import { Identicon } from '../Identicon';

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { publicKey } = useWallet();

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '15px 0',
        }}
      >
        <Identicon
          address={publicKey?.toBase58()}
          style={{
            width: 48,
          }}
        />
        {publicKey && (
          <>
            <Tooltip title="Address copied">
              <div
                style={{
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}
                onClick={() =>
                  navigator.clipboard.writeText(publicKey?.toBase58() || '')
                }
              >
                <CopyOutlined />
                &nbsp;{shortenAddress(publicKey?.toBase58())}
              </div>
            </Tooltip>
          </>
        )}
        <br />
        <span
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            width: 'calc(100% + 32px)',
            marginBottom: 10,
          }}
        ></span>
        {additionalSettings}
      </div>
    </>
  );
};
