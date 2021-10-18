import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { getTokenIcon, KnownTokenMap } from '../../utils';
import { useConnectionConfig } from '../../contexts/connection';
import { Identicon } from '../Identicon';

export const TokenIcon = (props: {
  mintAddress?: string | PublicKey;
  size?: number;
  className?: string;
  tokenMap?: KnownTokenMap;
}) => {
  let icon: string | undefined = '';
  if (props.tokenMap) {
    icon = getTokenIcon(props.tokenMap, props.mintAddress);
  } else {
    const { tokenMap } = useConnectionConfig();
    icon = getTokenIcon(tokenMap, props.mintAddress);
  }

  const size = props.size || 20;

  if (icon) {
    return (
      <img
        alt="Token icon"
        className={props.className}
        key={icon}
        width={size.toString()}
        height={size.toString()}
        src={icon}
      />
    );
  }
  return <Identicon address={props.mintAddress} />;
};

export const PoolIcon = (props: {
  mintA: string;
  mintB: string;
  className?: string;
}) => {
  return (
    <div className={props.className}>
      <TokenIcon mintAddress={props.mintA} />
      <TokenIcon mintAddress={props.mintB} />
    </div>
  );
};
