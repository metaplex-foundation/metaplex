import React, { useMemo } from 'react';
import { shortenAddress, useMeta } from '@oyster/common';

import { getCreator } from '../../../../../../components/PackCard/utils';
import { ArtContent } from '../../../../../../components/ArtContent';
import SmallLoader from '../../../../../../components/SmallLoader';
import { usePack } from '../../../../contexts/PackContext';

import GhostCard from './GhostCard';
import { cardDistance } from './constants';

const ghostCardsNumber = 3;

const ClaimingStep: React.FC = () => {
  const { pack, voucherMetadataKey } = usePack();

  const { whitelistedCreatorsByCreator } = useMeta();
  const { name = '', authority = '' } = pack?.info || {};

  const ghostCards = useMemo(
    () => Array.from({ length: ghostCardsNumber }),
    [],
  );

  const creator = useMemo(
    () => getCreator(whitelistedCreatorsByCreator, authority),
    [whitelistedCreatorsByCreator, authority],
  );

  return (
    <div className="redeem-root">
      <span className="redeem-title">{name}</span>
      <span className="redeem-creator">
        From {creator.name || shortenAddress(creator.address || '')}
      </span>
      <div className="redeem-cards-container">
        <div
          style={{ height: `${cardDistance * ghostCardsNumber}px` }}
          className="redeem-ghost-cards"
        >
          {ghostCards.map((_, index) => (
            <GhostCard key={index} index={index} />
          ))}
        </div>
        <ArtContent
          className="redeem-art-content"
          pubkey={voucherMetadataKey}
          preview={false}
        />
      </div>
      <div className="redeem-notes">
        <img src="wallet.svg" />
        <span>
          You may also have to approve the purchase in your wallet if you don’t
          have “auto-approve” turned on.
        </span>
      </div>
      <div className="redeem-footer">
        <SmallLoader />
        Retrieving first Card...
      </div>
    </div>
  );
};

export default ClaimingStep;
