import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { getTokenIcon, KnownTokenMap } from '../../utils';
import { useConnectionConfig } from '../../contexts/connection';
import { Identicon } from '../Identicon';

export const TokenIcon = ({
  mintAddress,
  size = 20,
  tokenMap,
}: {
  mintAddress?: string | PublicKey;
  size?: number;
  tokenMap?: KnownTokenMap;
}) => {
  let icon: string | undefined = '';
  if (tokenMap) {
    icon = getTokenIcon(tokenMap, mintAddress);
  } else {
    const { tokenMap } = useConnectionConfig();
    icon = getTokenIcon(tokenMap, mintAddress);
  }

  if (icon) {
    return (
      <img
        alt="Token icon"
        key={icon}
        width={size.toString()}
        height={size.toString()}
        src={icon}
      />
    );
  }
  return <Identicon address={mintAddress} />;
};

export const PoolIcon = (props: { mintA: string; mintB: string }) => {
  return (
    <div>
      <TokenIcon mintAddress={props.mintA} />
      <TokenIcon mintAddress={props.mintB} />
    </div>
  );
};
