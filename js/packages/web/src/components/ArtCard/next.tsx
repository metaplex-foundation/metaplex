import React, { MouseEventHandler } from 'react';
import { Card, CardProps, Button, Badge } from 'antd';
import { ArtContent } from './../ArtContent/next';
import { ArtType } from '../../types';
import { MetaAvatar } from '../MetaAvatar';
import { Artwork } from '../../hooks';

export interface ArtCardProps extends CardProps {
  art: Partial<Artwork>;

  preview?: boolean;
  small?: boolean;
  close?: () => void;
}

export const ArtCard = (props: ArtCardProps) => {
  let {
    art,

    className,
    small,
    preview,
    close,
    ...rest
  } = props;

  const badge = getBadge(art);
  const hasUnverifiedCreator = art?.creators?.some(c => !c.verified);

  const closeHandler: MouseEventHandler = e => {
    e.stopPropagation();
    e.preventDefault();
    close && close();
  };

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
              onClick={closeHandler}
            >
              X
            </Button>
          )}
          <ArtContent
            uri={art.uri}
            // uri={image} ???
            // animationURL={animationURL} ???
            // category={category} ???
            preview={preview}
          />
        </>
      }
      {...rest}
    >
      <Card.Meta
        title={art.title || ' '}
        description={
          <>
            <MetaAvatar creators={art?.creators} size={32} />
            <div className="edition-badge">{badge}</div>
          </>
        }
      />
    </Card>
  );

  return hasUnverifiedCreator ? (
    <Badge.Ribbon text="Unverified">{card}</Badge.Ribbon>
  ) : (
    card
  );
};

export const getBadge = (art: Partial<Artwork> | null) => {
  if (art?.type === ArtType.NFT) {
    return 'Unique';
  }
  if (art?.type === ArtType.Master) {
    return 'NFT 0';
  }
  if (art?.type === ArtType.Print) {
    return `${art.edition} of ${art.supply}`;
  }
  return '';
};
