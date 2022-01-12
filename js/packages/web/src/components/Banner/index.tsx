import React from 'react';
import { Typography, Button, Alert } from 'antd';
import { TwitterOutlined } from '@ant-design/icons';
import { StorefrontSocialInfo } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
const { Text } = Typography;
import { Link } from 'react-router-dom';

export const Banner = ({
  src,
  headingText,
  subHeadingText,
  children,
  logo,
  twitterVerification,
  ownerAddress,
}: {
  src?: string;
  headingText: string;
  subHeadingText?: string;
  children?: React.ReactNode;
  logo: string;
  twitterVerification?: string;
  social?: StorefrontSocialInfo;
  ownerAddress?: string;
}) => {
  const wallet = useWallet();

  return (
    <div id="metaplex-banner">
      {src ? (
        <img id="metaplex-banner-backdrop" src={src} />
      ) : (
        <div className="metaplex-margin-top-12"></div>
      )}

      <div className="logo-wrapper">
        <Link to="/" id="metaplex-header-logo">
          <img src={logo || ''} />
        </Link>
      </div>

      <div id="metaplex-banner-hero">
        <h1>{headingText}</h1>
        {subHeadingText && <Text>{subHeadingText}</Text>}
        {twitterVerification ? (
          <a
            href={'https://twitter.com/' + twitterVerification}
            target="_blank"
            rel="noreferrer"
            className="twitter-button"
          >
            {' '}
            <Button shape="round" icon={<TwitterOutlined />}>
              @{twitterVerification}
            </Button>
          </a>
        ) : (
          wallet.connected &&
          ownerAddress === wallet.publicKey?.toBase58() && (
            <div className="metaplex-margin-top-8">
              <Alert
                className="metaplex-flex-align-items-center metaplex-align-left"
                message="Connect your Twitter account"
                description={
                  <>
                    Help protect collectors by connecting your store to a
                    Twitter page on{' '}
                    <a
                      href="https://naming.bonfida.org/#/twitter-registration"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Bonfida
                    </a>
                  </>
                }
                icon={<TwitterOutlined />}
                showIcon
              />
            </div>
          )
        )}
      </div>
      {children}
    </div>
  );
};
