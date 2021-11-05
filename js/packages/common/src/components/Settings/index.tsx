import { CopyOutlined } from '@ant-design/icons';
import { useWallet } from '@solana/wallet-adapter-react';
import { Divider, Space, Tooltip } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import { shortenAddress } from '../../utils';
import { Identicon } from '../Identicon';

export const Settings = ({
  additionalSettings,
}: {
  additionalSettings?: JSX.Element;
}) => {
  const { publicKey } = useWallet();

  return (
    <div className="metaplex-settings">
      <Space direction="vertical" align="center">
        <Identicon address={publicKey?.toBase58()} size={48} />
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

            <Link to={`/owned`}>View Owned</Link>
          </>
        )}
      </Space>
      {additionalSettings && (
        <>
          <Divider />
          {additionalSettings}
        </>
      )}
    </div>
  );
};
