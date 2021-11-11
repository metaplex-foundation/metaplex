import React from 'react';
import { Typography } from 'antd';
import { shortenAddress } from '../../utils/utils';
import { PublicKey } from '@solana/web3.js';

export const ExplorerLink = (props: {
  address: string | PublicKey;
  type: string;
  code?: boolean;
  length?: number;
}) => {
  const { type, code } = props;

  const address =
    typeof props.address === 'string'
      ? props.address
      : props.address?.toBase58();

  if (!address) {
    return null;
  }

  const length = props.length ?? 9;

  return (
    <a
      href={`https://explorer.solana.com/${type}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      title={address}
    >
      {code ? (
        <Typography.Text code>
          {shortenAddress(address, length)}
        </Typography.Text>
      ) : (
        shortenAddress(address, length)
      )}
    </a>
  );
};
