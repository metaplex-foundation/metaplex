import { MetadataCategory, StringPublicKey } from '@oyster/common';
import { Badge, Button, Card, CardProps, Space, Tag } from 'antd';
import React from 'react';
import { useArt } from '../../hooks';
import { Artist, ArtType } from '../../types';
import { MetaAvatar } from '../MetaAvatar';
import { ArtContent } from './../ArtContent';

const { Meta } = Card;

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
  ...rest
}: ArtCardProps) => {
  const art = useArt(pubkey);
  const creators = art?.creators || creatorsProp || [];
  const name = art?.title || nameProp || ' ';

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
            pubkey={pubkey}
            uri={image}
            animationURL={animationURL}
            category={category}
            preview={preview}
            card
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

  return art.creators?.find(c => !c.verified) ? (
    <Badge.Ribbon text="Unverified">{card}</Badge.Ribbon>
  ) : (
    card
  );
};
