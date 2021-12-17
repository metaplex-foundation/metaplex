import { ArrowButton, StringPublicKey } from '@oyster/common';
import { Space } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Confetti } from '../../components/Confetti';

export const Congrats = (props: {
  auction?: {
    vault: StringPublicKey;
    auction: StringPublicKey;
    auctionManager: StringPublicKey;
  };
}) => {
  const navigate = useNavigate();

  const newTweetURL = () => {
    const params = {
      text: "I've listed an NFT on my @Holaplex store, check it out!",
      url: `${
        window.location.origin
      }/#/listings/${props.auction?.auction.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    };
    const queryParams = new URLSearchParams(params).toString();
    return `https://twitter.com/intent/tweet?${queryParams}`;
  };

  return (
    <Space className="metaplex-fullwidth" direction="vertical" align="center">
      <h2>Congratulations! Your auction is now live.</h2>
      <Space className="metaplex-space-align-stretch" direction="vertical">
        <ArrowButton
          className="metaplex-fullwidth"
          size="large"
          type="primary"
          onClick={() => window.open(newTweetURL(), '_blank')}
        >
          Share it on Twitter
        </ArrowButton>
        <ArrowButton
          className="metaplex-fullwidth"
          size="large"
          type="primary"
          onClick={() =>
            navigate(`/listings/${props.auction?.auction.toString()}`)
          }
        >
          View Listing
        </ArrowButton>
      </Space>
      <Confetti />
    </Space>
  );
};
