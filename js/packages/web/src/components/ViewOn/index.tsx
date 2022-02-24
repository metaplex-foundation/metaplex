import React from 'react';
import { useArt } from '../../hooks';
import { useConnectionConfig } from '@oyster/common';
import { Art } from '../../types';

type ViewOnProps = { id?: string; art?: undefined } | { art: Art };

export const ViewOn = (props: ViewOnProps) => {
  const { env } = useConnectionConfig();
  const art = props.art ?? useArt(props.id);

  return (
    <div className="nft-info-links-wrapper">
      <a href={art.uri || ''} target="_blank" rel="noreferrer">
        Metadata
      </a>
      <a
        href={`https://explorer.solana.com/account/${art?.mint || ''}${
          env.indexOf('main') >= 0 ? '' : `?cluster=${env}`
        }`}
        target="_blank"
        rel="noreferrer"
      >
        Transaction
      </a>
    </div>
  );
};
