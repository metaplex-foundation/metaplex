import React, { useState } from 'react';
import { Image } from 'antd';
import { MetadataCategory } from '@oyster/common';
import { MeshViewer } from '../MeshViewer';
import { ThreeDots } from '../MyLoader';
import { useCachedImage } from '../../hooks';

export const ArtContent = ({
  uri,
  extension,
  category,
  className,
  preview,
  style,
  files,
}: {
  category?: MetadataCategory;
  extension?: string;
  uri?: string;
  className?: string;
  preview?: boolean;
  style?: React.CSSProperties;
  files?: string[];
}) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const src = useCachedImage(uri || '');

  if (extension?.endsWith('.glb') || category === 'vr') {
    return <MeshViewer url={uri} className={className} style={style} />;
  }

  return category === 'video' ? (
    <video
      className={className}
      playsInline={true}
      autoPlay={false}
      muted={true}
      controls={true}
      controlsList="nodownload"
      style={style}
      loop={true}
      poster={extension}
    >
      {(files || []).filter((f, index, arr) => {
        // TODO: filter by fileType
        return (arr.length >= 2 ? index === 1 : index === 0);
      }).map((f, index, arr) => {
          return <source src={f} type="video/mp4" />;
      })}
    </video>
  ) : (
    <Image
      src={src}
      preview={preview}
      wrapperClassName={className}
      loading="lazy"
      wrapperStyle={{ ...style }}
      onLoad={e => {
        setLoaded(true);
      }}
      placeholder={<ThreeDots />}
      {...(loaded ? {} : { height: 200 })}
    />
  );
};
