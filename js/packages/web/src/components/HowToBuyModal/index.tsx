import { InstructionsModal } from '../InstructionsModal';
import React from 'react';
import { LABELS } from '../../constants';
import { ConnectButton } from '@oyster/common';
import { i18n } from '@lingui/core';

interface HowToBuyModalProps {
  buttonClassName: string;
  onClick?: any;
}

export const HowToBuyModal: React.FC<HowToBuyModalProps> = ({
  buttonClassName,
  onClick,
}) => {
  return (
    <InstructionsModal
      buttonClassName={buttonClassName}
      buttonText={/*i18n*/ i18n._('How to Buy')}
      modalTitle={
        /*i18n*/ i18n._('Buying NFTs on {name}', { name: LABELS.STORE_NAME })
      }
      cardProps={[
        {
          title: /*i18n*/ i18n._('Create a SOL wallet'),
          imgSrc: '/modals/how-to-buy-1.svg',
          description: /*i18n*/ i18n._(
            'SOL is the cryptocurrency we use for purchases on {name}. To keep your SOL safe, you’ll need a crypto wallet—we recommend using one called Phantom. Just head to Phantom’s site, install the Chrome extension, and create an account.',
            { name: LABELS.STORE_NAME },
          ),
        },
        {
          title: /*i18n*/ i18n._('Add funds to your wallet'),
          imgSrc: '/modals/how-to-buy-2.svg',
          description: /*i18n*/ i18n._(
            'To fund your wallet, you’ll need to purchase SOL tokens. The easiest way is with a credit card on FTX Pay—a service that’s already part of your new Phantom wallet. Open your wallet, tap “Deposit SOL”, and select “Deposit from FTX”. A new window will open where you can create an FTX account and purchase SOL.',
          ),
        },
        {
          title: /*i18n*/ i18n._('Connect your wallet to {name}', {
            name: LABELS.STORE_NAME,
          }),
          imgSrc: '/modals/how-to-buy-3.jpg',
          description: /*i18n*/ i18n._(
            'To connect your wallet, tap “Connect Wallet” here on the site. Select the Phantom option, and your wallet will connect. After that, you can start bidding on NFTs.',
          ),
          endElement: <ConnectButton className={'secondary-btn'} />,
        },
      ]}
      onClick={onClick}
    />
  );
};
