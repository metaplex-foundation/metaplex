import { InstructionsModal } from '../InstructionsModal';
import React from 'react';

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
      modalTitle="Buying NFTs Topps"
      cardProps={[
        {
          title: 'Create a SOL wallet',
          description:
            "SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.",
        },
        {
          title: 'Add funds to your wallet',
          description:
            "SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.",
        },
        {
          title: 'Connect your wallet to Topps and place a bid.',
          description:
            "SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.",
        },
      ]}
    />
  );
};
