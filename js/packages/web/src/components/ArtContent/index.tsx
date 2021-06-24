import React, { Ref, useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'antd';
import { MetadataCategory } from '@oyster/common';
import { MeshViewer } from '../MeshViewer';
import { ThreeDots } from '../MyLoader';
import { useCachedImage, useExtendedArt } from '../../hooks';
import { Stream, StreamPlayerApi } from '@cloudflare/stream-react';
import { useInView } from 'react-intersection-observer';
import { PublicKey } from '@solana/web3.js';

const MeshArtContent = ({
  uri,
  className,
  style,
  files,
}: {
  uri?: string;
  className?: string;
  style?: React.CSSProperties;
  files?: string[];
}) => {
  const renderURL = files && files.length > 0 ? files[0] : uri;
  const { isLoading } = useCachedImage(renderURL || '', true);

  if (isLoading) {
    return <CachedImageContent
      uri={uri}
      className={className}
      preview={false}
      style={{ width: 300, ...style }}/>;
  }

  return <MeshViewer url={renderURL} className={className} style={style} />;
}

const CachedImageContent = ({
  uri,
  className,
  preview,
  style,
}: {
  uri?: string;
  className?: string;
  preview?: boolean;
  style?: React.CSSProperties;
}) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const { cachedBlob, isLoading } = useCachedImage(uri || '');

  return <Image
      src={cachedBlob}
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
}

const VideoArtContent = ({
  extension,
  className,
  style,
  files,
  active,
}: {
  extension?: string;
  className?: string;
  style?: React.CSSProperties;
  files?: string[];
  active?: boolean;
}) => {
  const [playerApi, setPlayerApi] = useState<StreamPlayerApi>();

  const playerRef = useCallback(
    ref => {
      setPlayerApi(ref);
    },
    [setPlayerApi],
  );

  useEffect(() => {
    if (playerApi) {
      playerApi.currentTime = 0;
    }
  }, [active, playerApi]);

  const likelyVideo = (files || []).filter((f, index, arr) => {
    // TODO: filter by fileType
    return arr.length >= 2 ? index === 1 : index === 0;
  })[0];

  const content = (
    likelyVideo && likelyVideo.startsWith('https://watch.videodelivery.net/') ? (
      <div className={`${className} square`}>
        <Stream
          streamRef={(e: any) => playerRef(e)}
          src={likelyVideo.replace('https://watch.videodelivery.net/', '')}
          loop={true}
          height={600}
          width={600}
          controls={false}
          videoDimensions={{
            videoHeight: 700,
            videoWidth: 400,
          }}
          autoplay={true}
          muted={true}
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
  );



  return content;
};


export const ArtContent = ({
  category,
  className,
  preview,
  style,
  active,
  allowMeshRender,
  pubkey,

  uri,
  extension,
  files,
}: {
  category?: MetadataCategory;
  className?: string;
  preview?: boolean;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  ref?: Ref<HTMLDivElement>;
  active?: boolean;
  allowMeshRender?: boolean;
  pubkey?: PublicKey | string,

  extension?: string;
  uri?: string;
  files?: string[];
}) => {
  const id = typeof pubkey === 'string' ? pubkey : pubkey?.toBase58() || '';

  const { ref, data } = useExtendedArt(id);

  if(pubkey && data) {
    files = data.properties.files?.filter(f => typeof f === 'string') as string[];
    uri = data.image;
    category = data.properties.category;
  }

  if (allowMeshRender&& (extension?.endsWith('.glb') || category === 'vr')) {
    return <MeshArtContent
      uri={uri}
      className={className}
      style={style}
      files={files}/>;
  }

  const content = category === 'video' ? (
    <VideoArtContent
      extension={extension}
      className={className}
      style={style}
      files={files}
      active={active}
    />
  ) : (
    <CachedImageContent uri={uri}
      className={className}
      preview={preview}
      style={style}/>
  );

  return <div ref={ref as any}>{content}</div>;
};
