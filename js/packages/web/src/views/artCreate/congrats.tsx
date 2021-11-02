import { StringPublicKey } from '@oyster/common';
import { Button } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Confetti } from '../../components/Confetti';

export const Congrats = (props: {
  nft?: {
    metadataAccount: StringPublicKey;
  };
  alert?: string;
}) => {
  const history = useHistory();

  const newTweetURL = () => {
    const params = {
      text: "I've created a new NFT artwork on Metaplex, check it out!",
      url: `${
        window.location.origin
      }/#/art/${props.nft?.metadataAccount.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    };
    const queryParams = new URLSearchParams(params).toString();
    return `https://twitter.com/intent/tweet?${queryParams}`;
  };

  if (props.alert) {
    // TODO  - properly reset this components state on error
    return (
      <>
        <div>Sorry, there was an error!</div>
        <p>{props.alert}</p>
        <Button onClick={() => history.push('/artworks/new')}>
          Back to Create NFT
        </Button>
      </>
    );
  }

  return (
    <>
      <div>Congratulations, you created an NFT!</div>
      <div>
        <Button onClick={() => window.open(newTweetURL(), '_blank')}>
          <span>Share it on Twitter</span>
          <span>&gt;</span>
        </Button>
        <Button
          onClick={() =>
            history.push(`/art/${props.nft?.metadataAccount.toString()}`)
          }
        >
          <span>See it in your collection</span>
          <span>&gt;</span>
        </Button>
      </div>
      <Confetti />
    </>
  );
};
