import React, { useMemo, useState } from 'react';
import { shortenAddress, useMeta } from '@oyster/common';
import { SwitchTransition, CSSTransition } from 'react-transition-group';

import { getCreator } from '../../../../../../components/PackCard/utils';
import { ArtContent } from '../../../../../../components/ArtContent';
import SmallLoader from '../../../../../../components/SmallLoader';
import { usePack } from '../../../../contexts/PackContext';
import useInterval from '../../../../../../hooks/useInterval';

import GhostCard from './components/GhostCard';
import { CARDS_DISTANCE, INFO_MESSAGES } from './constants';
import { useGhostCards } from './hooks/useGhostCards';
import { CheckOutlined } from '@ant-design/icons';

interface ClaimingStepProps {
  onClose: () => void;
}

// Delay between switching cards on the slider
const DELAY_BETWEEN_CARDS_CHANGE = 4000;

const ClaimingStep: React.FC<ClaimingStepProps> = ({ onClose }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(-1);

  const { pack, voucherMetadataKey, provingProcess, redeemModalMetadata } =
    usePack();
  const { whitelistedCreatorsByCreator } = useMeta();
  const ghostCards = useGhostCards(currentCardIndex);

  const { name = '', authority = '' } = pack?.info || {};
  const { cardsRedeemed = 0, isExhausted = false } = provingProcess?.info || {};

  const creator = useMemo(
    () => getCreator(whitelistedCreatorsByCreator, authority),
    [whitelistedCreatorsByCreator, authority],
  );

  const isClaiming = currentCardIndex < cardsRedeemed - 1 || !isExhausted;
  const currentMetadataToShow =
    currentCardIndex >= 0
      ? redeemModalMetadata[currentCardIndex]
      : voucherMetadataKey;

  const titleText = isClaiming ? name : 'You Opened the Pack!';
  const subtitleText = isClaiming
    ? `From ${creator.name || shortenAddress(creator.address || '')}`
    : `${cardsRedeemed} new Cards were added to your wallet`;
  const footerText = isClaiming
    ? `Retrieving ${currentCardIndex === -1 ? 'first' : 'next'} Card...`
    : 'Pack Opening Succesful!';
  const infoMessageText =
    currentCardIndex === -1 ? INFO_MESSAGES[0] : INFO_MESSAGES[1];

  useInterval(
    () => {
      // Checking if can proceed with showing the next card
      if (currentCardIndex + 1 < cardsRedeemed) {
        // Select the next card to show
        setCurrentCardIndex(currentCardIndex + 1);
      }
    },
    // Delay in milliseconds or null to stop it
    isClaiming ? DELAY_BETWEEN_CARDS_CHANGE : null,
  );

  return (
    <div className="claiming-step">
      <span className="claiming-step__title">{titleText}</span>
      <span className="claiming-step__subtitle">{subtitleText}</span>
      <div className="claiming-step__cards-container">
        <div
          style={{ height: `${CARDS_DISTANCE * ghostCards.length}px` }}
          className="claiming-step__ghost-cards"
        >
          {ghostCards.map((_, index) => (
            <GhostCard key={index} index={index} />
          ))}
        </div>
        <div className="current-card-container">
          <SwitchTransition>
            <CSSTransition
              classNames="fade"
              key={currentCardIndex}
              addEndListener={(node, done) =>
                node.addEventListener('transitionend', done, false)
              }
            >
              <ArtContent
                key={currentCardIndex}
                pubkey={currentMetadataToShow}
                preview={false}
              />
            </CSSTransition>
          </SwitchTransition>
        </div>
      </div>
      {isClaiming && (
        <div className="claiming-step__notes">
          <img src="wallet.svg" />
          <span>{infoMessageText}</span>
        </div>
      )}
      {!isClaiming && (
        <button className="claiming-step__btn" onClick={onClose}>
          <span>Close and view cards</span>
        </button>
      )}
      <div className="claiming-step__footer">
        {isClaiming && <SmallLoader />}
        {!isClaiming && <CheckOutlined className="claiming-step__check" />}

        {footerText}
      </div>
    </div>
  );
};

export default ClaimingStep;
