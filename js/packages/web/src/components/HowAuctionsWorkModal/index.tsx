import { InstructionsModal } from '../InstructionsModal';
import React from 'react';

interface HowAuctionsWorkModalProps {
  buttonClassName: string;
}

export const HowAuctionsWorkModal: React.FC<HowAuctionsWorkModalProps> = ({
  buttonClassName,
}) => {
  return (
    <InstructionsModal
      buttonClassName={buttonClassName}
      buttonText="How Do Auctions Work?"
      modalTitle="How Auctions Work"
      cardProps={[
        {
          title: "Place your bid and we'll hold your SOL",
          description:
            "SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.",
        },
        {
          title: 'Win the auction',
          description:
            "SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.",
        },
        {
          title: 'Redeem your NFT',
          description:
            "SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL. Creators get paid in it, too.",
        },
      ]}
    />
  );
};
