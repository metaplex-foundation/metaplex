import React from 'react';
import { Typography } from 'antd';
import { shortenAddress } from '../../utils/utils';

export const EtherscanLink = (props: {
  address: string;
  type: string;
  code?: boolean;
  style?: React.CSSProperties;
  length?: number;
}) => {
  const { type, code } = props;

  const address = props.address;

  if (!address) {
    return null;
  }

  const length = props.length ?? 9;

  return (
    <a
      href={`https://etherscan.io/${type}/${address}`}
      // eslint-disable-next-line react/jsx-no-target-blank
      target="_blank"
      title={address}
      style={props.style}
    >
      {code ? (
        <Typography.Text style={props.style} code>
          {shortenAddress(address, length)}
        </Typography.Text>
      ) : (
        shortenAddress(address, length)
      )}
    </a>
  );
};
