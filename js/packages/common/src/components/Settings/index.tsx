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
      <div className="flex flex-col items-center justify-center w-full gap-[8px] p-[16px] border-b border-gray-700">
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
                className="flex items-center gap-[4px] text-white font-500"
                onClick={() =>
                  navigator.clipboard.writeText(publicKey?.toBase58() || '')
                }
              >
                <CopyOutlined />
                {shortenAddress(publicKey?.toBase58())}
              </div>
            </Tooltip>
          </>
        )}
      </div>

      <div className="flex">{additionalSettings}</div>
    </>
  );
};
