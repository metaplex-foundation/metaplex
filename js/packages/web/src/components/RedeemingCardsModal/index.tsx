import React, { useMemo } from 'react';
import { Modal } from 'antd';
import { shortenAddress, useMeta } from '@oyster/common';

import { getCreator } from '../PackCard/utils';
import { ArtContent } from '../ArtContent';
import SmallLoader from '../SmallLoader';
import GhostCard from './GhostCard';
import { cardDistance } from './constants';

interface RedeemModalProps {
  isModalVisible: boolean,
  onClose: () => void,
  pack: any,
}

const RedeemCardContent: React.FC<RedeemModalProps> = ({ pack }) => {
  const { whitelistedCreatorsByCreator } = useMeta();
  const { name, authority, allowedAmountToRedeem } = pack.info;
  const ghostCardsNumber = useMemo(() => Math.min(allowedAmountToRedeem, 5), [allowedAmountToRedeem]);

  const ghostCards = useMemo(
    () => Array.from({ length: ghostCardsNumber }),
    [ghostCardsNumber],
  );

  const creator = useMemo(
    () => getCreator(whitelistedCreatorsByCreator, authority),
    [whitelistedCreatorsByCreator, authority],
  );

  return (
    <div className="redeem-root">
      <span className="redeem-title">{name}</span>
      <span className="redeem-creator">From {creator.name || shortenAddress(creator.address || '')}</span>
      <div className="redeem-cards-container">
        <div style={{height: `${cardDistance * ghostCardsNumber}px`}} className="redeem-ghost-cards">
          {
            ghostCards.map((_, index) => <GhostCard key={index} index={index} />)
          }
        </div>
        <ArtContent
          className="redeem-art-content"
          pubkey={pack.voucherMetadata.pubkey}
          preview={false}
        />
      </div>
      <div className="redeem-notes">
        <img src="wallet.svg" />
        <span>
          You may also have to approve the purchase in your wallet if you don’t have “auto-approve” turned on.
        </span>
      </div>
     <div className="redeem-footer">
       <SmallLoader />
       Retrieving first Card...
     </div>
    </div>
  )
};

export const RedeemingCardsModal: React.FC<RedeemModalProps> = (props) => {
  return (
    <Modal
      width={500}
      onCancel={props.onClose}
      footer={null}
      visible={props.isModalVisible}
      closable={false}
    >
      <RedeemCardContent {...props} />
    </Modal>
  )
}
