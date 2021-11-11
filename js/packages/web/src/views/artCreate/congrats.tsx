import { ArrowButton, StringPublicKey } from '@oyster/common';
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
      text: 'I created a new NFT artwork, check it out!',
      url: `${
        window.location.origin
      }/#/artworks/${props.nft?.metadataAccount.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex,Holaplex',
      related: 'Metaplex,Solana,Holaplex',
    };
    const queryParams = new URLSearchParams(params).toString();
    return `https://twitter.com/intent/tweet?${queryParams}`;
  };

  if (props.alert) {
    // TODO  - properly reset this components state on error
    return (
      <Space className="metaplex-fullwidth" direction="vertical" align="center">
        <div>
          <h2>Sorry, there was an error!</h2>
          <p>{props.alert}</p>
        </div>
        <Button type="primary" onClick={() => history.push('/artworks/new')}>
          Back to Create NFT
        </Button>
      </Space>
    );
  }

  return (
    <Space className="metaplex-fullwidth" direction="vertical" align="center">
      <h2>Congratulations, you created an NFT!</h2>
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
            history.push(`/artworks/${props.nft?.metadataAccount.toString()}`)
          }
        >
          See it in your collection
        </ArrowButton>
      </Space>
      <Confetti />
    </Space>
  );
};
