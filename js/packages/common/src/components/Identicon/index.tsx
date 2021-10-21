import React, { useEffect, useRef } from 'react';

import Jazzicon from 'jazzicon';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';

export const Identicon = (props: {
  address?: string | PublicKey;
  alt?: string;
}) => {
  const { alt } = props;
  const address =
    typeof props.address === 'string'
      ? props.address
      : props.address?.toBase58();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (address && ref.current) {
      try {
        // TODO: ?????????
        ref.current.innerHTML = '';
        ref.current.appendChild(
          Jazzicon(
            16,
            parseInt(bs58.decode(address).toString('hex').slice(5, 15), 16),
          ),
        );
      } catch (err) {
        // TODO
      }
    }
  }, [address]);

  return <div title={alt} ref={ref} />;
};
