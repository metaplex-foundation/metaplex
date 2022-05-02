import { InstructionsModal } from '../InstructionsModal';
import React from 'react';
import { LABELS } from '../../constants';

interface HowAuctionsWorkModalProps {
  buttonClassName: string;
}

export const HowAuctionsWorkModal: React.FC<HowAuctionsWorkModalProps> = ({
  buttonClassName,
}) => {
  return (
    <InstructionsModal
      buttonClassName={buttonClassName}
      buttonText="How Auctions Work"
      modalTitle="How Auctions Work"
      cardProps={[
        {
          title: 'Placing a Bid',
          description: `Once you find an NFT you’d like to own, place a bid on the auction page. Keep in mind the amount of SOL you bid will be locked in your wallet for the remainder of the auction.`,
          imgSrc: '/modals/how-auctions-work-1.jpg',
        },
        {
          title: 'Winning an Auction',
          description: `Keep an eye on the auctions page (and your notifications) to know when you’ve been outbid, and how the sale is progressing.`,
          imgSrc: '/modals/how-auctions-work-2.jpg',
        },
        {
          title: 'Redeeming your NFT',
          description: `If you’re lucky enough to win your NFT auction, you’ll have to redeem it to add it to your wallet. This can be done from the auction, winning notification, or your profile on ${LABELS.STORE_NAME}.`,
          imgSrc: '/modals/how-auctions-work-3.jpg',
        },
      ]}
    />
  );
};
