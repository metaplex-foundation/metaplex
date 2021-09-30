import React, { useCallback, useEffect, useState } from 'react';
import { Image } from 'antd';
import { MetadataCategory, MetadataFile } from '@oyster/common';
import { MeshViewer } from '../MeshViewer';
import { ThreeDots } from '../MyLoader';
import { useCachedImage, useExtendedArt } from '../../hooks/useArtNext';
import { Stream, StreamPlayerApi } from '@cloudflare/stream-react';
import { getLast } from '../../utils/utils';
import { useMemo } from 'react';

const MeshArtContent = ({
  uri,
  animationUrl,
  className,
  style,
  files,
}: {
  uri?: string;
  animationUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  files?: (MetadataFile | string)[];
}) => {
  const renderURL =
    files && files.length > 0 && typeof files[0] === 'string'
      ? files[0]
      : animationUrl;
  const { isLoading } = useCachedImage(renderURL || '', true);

  if (isLoading) {
    return (
      <CachedImageContent
        uri={uri}
        className={className}
        preview={false}
        style={{ width: 300, ...style }}
      />
    );
  }

  return <MeshViewer url={renderURL} className={className} style={style} />;
};

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
  const { cachedBlob } = useCachedImage(uri || '');

  return (
    <Image
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
  );
};

const VideoArtContent = ({
  className,
  style,
  files,
  uri,
  animationURL,
  active,
}: {
  className?: string;
  style?: React.CSSProperties;
  files?: (MetadataFile | string)[];
  uri?: string;
  animationURL?: string;
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
    if (typeof f !== 'string') {
      return false;
    }

    // TODO: filter by fileType
    return arr.length >= 2 ? index === 1 : index === 0;
  })?.[0] as string;

  const content =
    likelyVideo &&
    likelyVideo.startsWith('https://watch.videodelivery.net/') ? (
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
        autoPlay={true}
        muted={true}
        controls={true}
        controlsList="nodownload"
        style={style}
        loop={true}
        poster={uri}
      >
        {likelyVideo && (
          <source src={likelyVideo} type="video/mp4" style={style} />
        )}
        {animationURL && (
          <source src={animationURL} type="video/mp4" style={style} />
        )}
        {files
          ?.filter(f => typeof f !== 'string')
          .map((f: any) => (
            <source src={f.uri} type={f.type} style={style} />
          ))}
      </video>
    );

  return content;
};

const HTMLContent = ({
  uri,
  animationUrl,
  className,
  preview,
  style,
  files,
  artView,
}: {
  uri?: string;
  animationUrl?: string;
  className?: string;
  preview?: boolean;
  style?: React.CSSProperties;
  files?: (MetadataFile | string)[];
  artView?: boolean;
}) => {
  if (!artView) {
    return (
      <CachedImageContent
        uri={uri}
        className={className}
        preview={preview}
        style={style}
      />
    );
  }
  const htmlURL =
    files && files.length > 0 && typeof files[0] === 'string'
      ? files[0]
      : animationUrl;
  return (
    <iframe
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      sandbox="allow-scripts"
      frameBorder="0"
      src={htmlURL}
      className={className}
      style={style}
    ></iframe>
  );
};

export const ArtContent = ({
  className,
  style,
  preview,
  active,
  allowMeshRender,
  uri,

  image,
  category,
  animationURL = '',
  artView,
  files,
}: {
  className?: string;
  style?: React.CSSProperties;
  preview?: boolean;
  active?: boolean;
  allowMeshRender?: boolean;
  uri?: string;

  image?: string;
  category?: MetadataCategory;
  animationURL?: string;
  artView?: boolean;
  files?: (MetadataFile | string)[]; // XXX: no one pass
}) => {
  const { ref, data } = useExtendedArt(uri);

  if (data) {
    image = data.image;
    animationURL = data.animation_url || '';
    if (data.properties) {
      files = data.properties.files;
      category = data.properties.category;
    }
  }

  const animationUrlExt = useMemo(() => {
    const params = getLast(animationURL.split('?'));
    return new URLSearchParams(params).get('ext');
  }, [animationURL]);

  const isMeshContent =
    allowMeshRender &&
    (category === 'vr' ||
      animationUrlExt === 'glb' ||
      animationUrlExt === 'gltf');

  // ?? render without <div> wrapper?
  if (isMeshContent) {
    return (
      <MeshArtContent
        uri={image}
        animationUrl={animationURL}
        className={className}
        style={style}
        files={files}
      />
    );
  }

  const content =
    category === 'video' ? (
      <VideoArtContent
        className={className}
        style={style}
        files={files}
        uri={image}
        animationURL={animationURL}
        active={active}
      />
    ) : category === 'html' || animationUrlExt === 'html' ? (
      <HTMLContent
        uri={image}
        animationUrl={animationURL}
        className={className}
        preview={preview}
        style={style}
        files={files}
        artView={artView}
      />
    ) : (
      <CachedImageContent
        uri={image}
        className={className}
        preview={preview}
        style={style}
      />
    );

  return (
    <div
      ref={ref as any}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {content}
    </div>
  );
};
