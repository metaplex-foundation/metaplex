import { StringPublicKey } from '@oyster/common';
import { Button, Space } from 'antd';
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
      text: "I've created a new NFT on my @Holaplex store, check it out!",
      url: `${window.location.origin}/#/artworks/${props.nft?.metadataAccount.toString()}`,
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
      <h2>Congratulations, you created an NFT!</h2>
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
            history.push(`/art/${props.nft?.metadataAccount.toString()}`)
          }
        >
          <span>See it in your collection</span>
        </Button>
      </Space>
      <Confetti />
    </>
  );
};
