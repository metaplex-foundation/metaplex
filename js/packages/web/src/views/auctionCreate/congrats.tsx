import { StringPublicKey } from '@oyster/common';
import { Button, Space } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Confetti } from '../../components/Confetti';

export const Congrats = (props: {
  auction?: {
    vault: StringPublicKey;
    auction: StringPublicKey;
    auctionManager: StringPublicKey;
  };
}) => {
  const history = useHistory();

  const newTweetURL = () => {
    const params = {
      text: "I've listed an NFT on my @Holaplex store, check it out!",
      url: `${window.location.origin}/#/auction/${props.auction?.auction.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    };
    const queryParams = new URLSearchParams(params).toString();
    return `https://twitter.com/intent/tweet?${queryParams}`;
  };

  return (
    <>
      <h2>Congratulations! Your auction is now live.</h2>
      <Space className="metaplex-align-stretch">
        <Button
          size="large"
          type="primary"
          onClick={() => window.open(newTweetURL(), '_blank')}
        >
          <span>Share it on Twitter</span>
        </Button>
        <Button
          size="large"
          type="primary"
          onClick={() =>
            history.push(`/auction/${props.auction?.auction.toString()}`)
          }
        >
          <span>See it in your auctions</span>
        </Button>
      </Space>
      <Confetti />
    </>
  );
};
