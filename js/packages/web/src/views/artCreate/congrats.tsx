import { ArrowButton, StringPublicKey } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Space } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Confetti } from '../../components/Confetti';
import { useAnalytics } from '../../contexts';

export const Congrats = (props: {
  nft?: {
    metadataAccount: StringPublicKey;
  };
  alert?: string;
}) => {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { track } = useAnalytics();

  const path = `/creators/${wallet.publicKey?.toBase58()}/nfts/${props.nft?.metadataAccount.toString()}`;

  const newTweetURL = () => {
    const params = {
      text: 'I created a new NFT artwork, check it out!',
      url: `${window.location.origin}${path}`,
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
        <Button type="primary" onClick={() => navigate('/nfts/new')}>
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
          onClick={() => {
            track('Share NFT', {
              event_category: 'Minter',
            });
            window.open(newTweetURL(), '_blank');
          }}
        >
          Share it on Twitter
        </ArrowButton>
        <ArrowButton
          className="metaplex-fullwidth"
          size="large"
          type="primary"
          onClick={() => {
            navigate(path);
          }}
        >
          See it in your collection
        </ArrowButton>
      </Space>
      <Confetti />
    </Space>
  );
};
