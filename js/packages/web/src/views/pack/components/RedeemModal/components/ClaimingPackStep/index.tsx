import React from 'react';

import RedeemCard from '../RedeemCard';
import { PackMetadataByPackCard } from '../../../../hooks/useMetadataByPackCard';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface IPropsClaimingPackStep {
  numberOfNFTs: number,
  numberOfAttempts: number,
  metadataByPackCard: PackMetadataByPackCard,
  creators: string[],
  onClose: () => void,
}

const ClaimingPackStep = ({ numberOfNFTs, numberOfAttempts, metadataByPackCard, creators, onClose }: IPropsClaimingPackStep) =>
  (
    <div>
      <div className="modal-redeem__title-container">
        <p className="title">Claiming Pack Cards</p>
        <p className="title">
          <ArrowLeftOutlined onClick={onClose} className="arrow-back"/>
          Claim Pack Cards
        </p>
      </div>
      <div className="modal-redeem__body">
        <p className="body-title">Pack of {numberOfNFTs}</p>
        <p className="body-desc">
          Your Pack from {creators.join(', ')} grants you {numberOfAttempts} chances to own any of the following Cards.
        </p>

        <div className="modal-redeem__cards">
          <p>POTENTIAL NFTs</p>
          {metadataByPackCard &&
          Object.values(metadataByPackCard).map(
            item =>
              item && (
                <RedeemCard
                  key={item.pubkey}
                  item={item}
                  probability={item.probability}
                />
              ),
          )}
        </div>
      </div>
    </div>
  )

export default ClaimingPackStep;
