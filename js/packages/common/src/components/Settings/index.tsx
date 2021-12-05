import React, { useCallback } from 'react';
import { Button, Select } from 'antd';
import { Tooltip } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import { ENDPOINTS, useConnectionConfig } from '../../contexts/connection';
import { useWalletModal } from '../../contexts';
import { notify, shortenAddress } from '../../utils';
import { CopyOutlined } from '@ant-design/icons';
import { Identicon } from '../Identicon';
import { HashQueryLink } from '../HashQueryLink';

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { connected, disconnect, publicKey } = useWallet();
  const { endpoint } = useConnectionConfig();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);

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

            <HashQueryLink
              to={`/profile/${publicKey?.toBase58()}`}
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              View profile
            </HashQueryLink>
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
