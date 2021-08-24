import React from 'react';
import { Card, CardProps, Button, Badge } from 'antd';
import { MetadataCategory, StringPublicKey } from '@oyster/common';
import { ArtContent } from './../ArtContent';
import { useArt } from '../../hooks';
import { PublicKey } from '@solana/web3.js';
import { Artist } from '../../types';
import { CloseOutlined } from '@ant-design/icons';
import { ApeTag } from '../ApeTag/ape-tag';

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
  close?: () => void;
  hideMeta?: boolean;

  height?: number;
  width?: number;
  ape?:any;
}

export const ArtCard = (props: ArtCardProps) => {
  let {
    className,
    small,
    category,
    image,
    animationURL,
    preview,
    creators,
    description,
    close,
    pubkey,
    hideMeta,
    height,
    width,
    ape,
    ...rest
  } = props;
  const art = useArt(pubkey);
  creators = art?.creators || creators || [];

  const card = (
    <Card
      hoverable={true}
      className={`art-card ${small ? 'small' : ''} ${className ?? ''}`}
      cover={
        <>
          {close && (
            <Button
              className="card-close-button"
              shape="circle"
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                close && close();
              }}
            >
              <CloseOutlined />
            </Button>
          )}
          <ArtContent
            pubkey={pubkey}

            uri={ape?.image || image}
            animationURL={animationURL}
            category={category}

            preview={preview}
            height={height}
            width={width}
          />
        </>
      }
      {...rest}
    >
     {!hideMeta && <Meta
        title={`${ape?.name}`}
        description={
          <>
          {ape?.attributes?.map(ApeTag)}
            {/* <MetaAvatar creators={creators} size={32} /> */}
            {/* {art.type === ArtType.Master && (
              <>
                <br />
                {!endAuctionAt && (
                  <span style={{ padding: '24px' }}>
                    {(art.maxSupply || 0) - (art.supply || 0)}/
                    {art.maxSupply || 0} prints remaining
                  </span>
                )}
              </>
            )} */}
            {/* <div className="edition-badge">{badge}</div> */}
          </>
        }
      />}
    </Card>
  );

  return art.creators?.find(c => !c.verified) ? (
    <Badge.Ribbon text="Unverified"><div className="art-card">
      {card}</div></Badge.Ribbon>
  ) : (
    card
  );
};
