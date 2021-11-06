import React, { CSSProperties, useEffect, useMemo, useRef } from 'react';

import jazzicon from '@metamask/jazzicon';
import { PublicKey } from '@solana/web3.js';

export const Identicon = ({
  size,
  address,
  alt,
}: {
  size?: CSSProperties['width'];
  address?: string | PublicKey;
  alt?: string;
}) => {
  const pubkey = typeof address === 'string' ? new PublicKey(address) : address;
  const ref = useRef<HTMLDivElement>(null);

  const el = useMemo(() => {
    if (!pubkey) return undefined;

    const el = jazzicon(72, Array.from(new Uint32Array(pubkey.toBytes())));

    // There's no need for jazzicon to dictate the element size, this allows
    // auto-scaling the element and its contents
    const svg = el.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', '0 0 72 72');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      ['x', 'y', 'width', 'height'].forEach(a => svg.removeAttribute(a));
    }

    return el;
  }, [pubkey]);

  useEffect(() => {
    // TODO: the current TSC toolchain does not have a correct definition for replaceChildren
    // @ts-ignore
    if (el && ref.current) ref.current.replaceChildren(el);
  }, [el, ref.current]);

  return (
    <div
      title={alt}
      ref={ref}
      style={size ? { width: size, height: size } : {}}
      className="metaplex-jazzicon"
    />
  );
};
