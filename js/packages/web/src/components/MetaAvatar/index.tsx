import React, { useState } from 'react';
import { Avatar } from 'antd';
import { Artist } from '../../types';
import { Identicon } from '@oyster/common';

const MetaAvatarItem = (props: {
  creator: Artist;
  size: number;
  alt?: string;
}) => {
  const { creator, size, alt } = props;
  const [noImage, setNoImage] = useState(false);
  const image = creator.image || '';

  return (
    <Avatar
      alt={alt}
      size={size}
      src={
        noImage ? (
          <Identicon
            alt={alt}
            address={creator.address}
            style={{ width: size }}
          />
        ) : (
          image
        )
      }
      onError={() => {
        setNoImage(true);
        return false;
      }}
    />
  );
};

export const MetaAvatar = (props: {
  creators?: Artist[];
  showMultiple?: boolean;
  size?: number;
}) => {
  const { creators, showMultiple } = props;
  const size = props.size || 32;

  if (!creators || creators.length === 0) {
    return <Avatar size={size} src={false} />;
  }

  const controls = (creators || []).map((creator, ii) => (
    <MetaAvatarItem creator={creator} alt={creator.name} key={ii} size={size} />
  ));

  if (!showMultiple) {
    return controls[0];
  }

  return <Avatar.Group>{controls || null}</Avatar.Group>;
};

export const MetaAvatarDetailed = (props: {
  creators?: Artist[];
  size?: number;
}) => {
  const { creators } = props;
  const size = props.size || 32;
  if (!creators || creators.length === 0) {
    return <Avatar size={size} src={false} />;
  }
  return (
    <div>
      {(creators || []).map((creator, _idx) => (
        <div style={{ display: 'flex' }} key={_idx}>
          <MetaAvatarItem creator={creator} alt={creator.name} size={size} />
          <p style={{ marginLeft: 10 }}>
            {creator.name ? creator.name : 'No name provided.'}
          </p>
        </div>
      ))}
    </div>
  );
};
