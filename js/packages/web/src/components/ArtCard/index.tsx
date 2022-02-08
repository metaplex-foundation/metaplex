import { MetadataCategory, StringPublicKey, useMeta } from '@oyster/common';
import { PublicKey } from '@solana/web3.js';
import { Badge, Button, Card, CardProps, Space, Tag } from 'antd';
import React, { useState } from 'react';
import { useEffect } from 'react';
import { useArt } from '../../hooks';
import { Artist, ArtType } from '../../types';
import { MetaAvatar } from '../MetaAvatar';
import { holaSignMetadata } from '../MintModal/sign-meta';
import { ArtContent } from './../ArtContent';

const META_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const { Meta } = Card;

enum SigningStatus {
  UNVERIFIED,
  PENDING,
  VERIFICATION_SENT,
  VERIFIED,
}

export interface ArtCardProps extends CardProps {
  pubkey?: StringPublicKey;

  image?: string;
  animationURL?: string;

  category?: MetadataCategory;

  name?: string;
  symbol?: string;
  description?: string;
  creators?: Artist[];
  preview?: boolean;
  small?: boolean;
  hoverable?: boolean;
  close?: () => void;
  solanaEndpoint?: string;
  allowRetrySigning?: boolean;
}

export const ArtCard = ({
  category,
  image,
  animationURL,
  name: nameProp,
  preview,
  creators: creatorsProp,
  hoverable = true,
  close,
  pubkey,
  solanaEndpoint,
  allowRetrySigning = false,
  ...rest
}: ArtCardProps) => {
  const art = useArt(pubkey);
  const creators = art?.creators || creatorsProp || [];
  const name = art?.title || nameProp || ' ';
  const unverified = art.creators?.find(c => !c.verified);
  const { metadataByMetadata } = useMeta();
  const metaDataKey = metadataByMetadata[pubkey as string];
  const [signingStatus, setSigningStatus] = useState<SigningStatus>(
    unverified ? SigningStatus.UNVERIFIED : SigningStatus.VERIFIED,
  );

  const retrySigning = async () => {
    const metaProgramId = new PublicKey(META_PROGRAM_ID);
    const metadata = new PublicKey(metaDataKey.pubkey);
    if (!solanaEndpoint) {
      throw new Error('solanaEndpoint is required for retrySigning');
    }

    await holaSignMetadata({
      solanaEndpoint,
      metadata,
      metaProgramId,
      onComplete: () => {
        setSigningStatus(SigningStatus.VERIFICATION_SENT);
        console.log('signing call sent');
      },
      onProgress: status => {
        setSigningStatus(SigningStatus.PENDING);
        console.log('signing progress', status);
      },
      onError: (msg: string) => {
        setSigningStatus(SigningStatus.UNVERIFIED);
        throw new Error(msg);
      },
    });
  };

  useEffect(() => {
    if (
      allowRetrySigning &&
      unverified &&
      solanaEndpoint &&
      signingStatus === SigningStatus.UNVERIFIED
    ) {
      retrySigning();
    }
  }, [retrySigning, unverified, allowRetrySigning, signingStatus]);

  let badge = '';
  if (art.type === ArtType.NFT) {
    badge = 'Unique';
  } else if (art.type === ArtType.Master) {
    badge = 'NFT 0';
  } else if (art.type === ArtType.Print) {
    badge = `${art.edition} of ${art.supply}`;
  }

  const card = (
    <Card
      hoverable={hoverable}
      cover={
        <>
          {close && (
            <Button
              className="metaplex-square-w"
              shape="circle"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                close && close();
              }}
            >
              X
            </Button>
          )}
          <ArtContent
            square
            pubkey={pubkey}
            uri={image}
            animationURL={animationURL}
            category={category}
            preview={preview}
            backdrop="light"
          />
        </>
      }
      {...rest}
    >
      <Meta
        title={`${name}`}
        description={
          <Space direction="horizontal">
            <MetaAvatar creators={creators} size={32} />
            {/* {art.type === ArtType.Master && (
              <>
                <br />
                {!endAuctionAt && (
                  <span>
                    {(art.maxSupply || 0) - (art.supply || 0)}/
                    {art.maxSupply || 0} prints remaining
                  </span>
                )}
              </>
            )} */}
            {badge && <Tag>{badge}</Tag>}
          </Space>
        }
      />
    </Card>
  );

  return unverified ? (
    <Badge.Ribbon text="Unverified">{card}</Badge.Ribbon>
  ) : (
    card
  );
};
