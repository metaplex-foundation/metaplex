import React, { Ref, useEffect, useState } from 'react';
import { Image } from 'antd';
import { MetadataCategory } from '@oyster/common';
import { MeshViewer } from '../MeshViewer';
import { ThreeDots } from '../MyLoader';
import { useCachedImage } from '../../hooks';
import { Stream, StreamPlayerApi } from '@cloudflare/stream-react';

export const ArtContent = ({
  uri,
  extension,
  category,
  className,
  preview,
  style,
  files,
  active
}: {
  category?: MetadataCategory;
  extension?: string;
  uri?: string;
  className?: string;
  preview?: boolean;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  files?: string[];
  ref?: Ref<HTMLDivElement>;
  active?: boolean;
}) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const playerApiRef = React.useRef<StreamPlayerApi>(null);
  const src = useCachedImage(uri || '');

  useEffect(() => {
    if (playerApiRef.current) {
      playerApiRef.current.currentTime = 0;

      if (active === undefined) {
        playerApiRef.current.muted = true;
        playerApiRef.current?.play();
      } else {
        if (active) {
          playerApiRef.current.muted = false;
          playerApiRef.current.play();
        } else {
          playerApiRef.current.pause();
        }
      }
    }
  }, [active]);

  if (extension?.endsWith('.glb') || category === 'vr') {
    return <MeshViewer url={uri} className={className} style={style} />;
  }
  const likelyVideo = (files || []).filter((f, index, arr) => {
    // TODO: filter by fileType
    return arr.length >= 2 ? index === 1 : index === 0;
  })[0];

  return category === 'video' ? (
    likelyVideo.startsWith('https://watch.videodelivery.net/') ? (
      <div className={`${className} square`}>
        <Stream
          streamRef={playerApiRef}
          src={likelyVideo.replace('https://watch.videodelivery.net/', '')}
          loop={true}
          height={600}
          width={600}
          controls={false}
          videoDimensions={{
            videoHeight: 700,
            videoWidth: 400,
          }}
        />
      </div>
    ) : (
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
        <source src={likelyVideo} type="video/mp4" style={style} />
      </video>
    )
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
