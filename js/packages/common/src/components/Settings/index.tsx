import React, { useCallback } from 'react';
import { Button, Select } from 'antd';
import { Tooltip } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import { ENDPOINTS, useConnectionConfig } from '../../contexts/connection';
import { useWalletModal } from '../../contexts';
import { notify, shortenAddress } from '../../utils';
import { CopyOutlined } from '@ant-design/icons';
import { Identicon } from '../Identicon';
import { Link } from 'react-router-dom';

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { connected, disconnect, publicKey } = useWallet();
  const { endpoint, setEndpoint } = useConnectionConfig();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);

  return (
    <>
      <div>
        <Identicon address={publicKey?.toBase58()} />
        {publicKey && (
          <>
            <Tooltip title="Address copied">
              <div
                onClick={() =>
                  navigator.clipboard.writeText(publicKey?.toBase58() || '')
                }
              >
                <CopyOutlined />
                &nbsp;{shortenAddress(publicKey?.toBase58())}
              </div>
            </Tooltip>

            <Link to={`/profile/${publicKey?.toBase58()}`}>View profile</Link>
          </>
        )}
        <br />
        {additionalSettings}
      </div>
    </>
  );
};
