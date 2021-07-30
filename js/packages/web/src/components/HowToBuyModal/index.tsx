import { InstructionsModal } from '../InstructionsModal';
import React from 'react';
import { LABELS } from '../../constants';

interface HowToBuyModalProps {
  buttonClassName: string;
}

export const HowToBuyModal: React.FC<HowToBuyModalProps> = ({
  buttonClassName,
}) => {
  return (
    <InstructionsModal
      buttonClassName={buttonClassName}
      buttonText="How to Buy"
      modalTitle={`Buying NFTs ${LABELS.STORE_NAME}`}
      cardProps={[
        {
          title: 'Create a SOL wallet',
          imgSrc: '/modals/how-to-buy-1.svg',
          description: `SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on ${LABELS.STORE_NAME}'s NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.`,
        },
        {
          title: 'Add funds to your wallet',
          imgSrc: '/modals/how-to-buy-2.svg',
          description: `SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on ${LABELS.STORE_NAME}'s NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.`,
        },
        {
          title: `Connect your wallet to ${LABELS.STORE_NAME} and place a bid.`,
          imgSrc: '/modals/how-to-buy-3.svg',
          description: `SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on ${LABELS.STORE_NAME}'s NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.`,
        },
      ]}
    />
  );
};
