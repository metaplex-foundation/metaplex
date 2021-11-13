import { Stream, StreamPlayerApi } from '@cloudflare/stream-react';
import { MetadataCategory, MetadataFile, pubkeyToString } from '@oyster/common';
import { PublicKey } from '@solana/web3.js';
import { Image } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useCachedImage, useExtendedArt } from '../../hooks';
import { getLast } from '../../utils/utils';
import { MeshViewer } from '../MeshViewer';

const MeshArtContent = ({
  uri,
  animationUrl,
  files,
}: {
  uri?: string;
  animationUrl?: string;
  files?: (MetadataFile | string)[];
}) => {
  const renderURL =
    files && files.length > 0 && typeof files[0] === 'string'
      ? files[0]
      : animationUrl;

  const { isLoading } = useCachedImage(renderURL || '', true);

  if (isLoading) {
    return <CachedImageContent uri={uri} preview={false} />;
  }

  return <MeshViewer url={renderURL} />;
};

const CachedImageContent = ({
  uri,
  preview,
}: {
  uri?: string;
  preview?: boolean;
}) => {
  const [, /* loaded */ setLoaded] = useState<boolean>(false);
  const { cachedBlob } = useCachedImage(uri || '');

  return (
    <Image
      wrapperClassName="metaplex-image-content"
      src={cachedBlob}
      preview={preview}
      loading="lazy"
      onLoad={() => {
        setLoaded(true);
      }}
    />
  );
};

const VideoArtContent = ({
  files,
  uri,
  animationURL,
  active,
}: {
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
      <Stream
        streamRef={(e: any) => playerRef(e)}
        src={likelyVideo.replace('https://watch.videodelivery.net/', '')}
        loop={true}
        controls={false}
        autoplay={true}
        muted={true}
      />
    ) : (
      <video
        className="metaplex-video-content"
        playsInline={true}
        autoPlay={true}
        muted={true}
        controls={true}
        controlsList="nodownload"
        loop={true}
        poster={uri}
      >
        {likelyVideo && <source src={likelyVideo} type="video/mp4" />}
        {animationURL && <source src={animationURL} type="video/mp4" />}
        {(files?.filter(f => !!f && typeof f !== 'string') as MetadataFile[])?.map(
          (f: MetadataFile, i) => (
            <source key={i} src={f.uri} type={f.type} />
          ),
        )}
      </video>
    );

  return <div className="metaplex-video-content">{content}</div>;
};

const HTMLContent = ({
  uri,
  animationUrl,
  preview,
  files,
  artView,
}: {
  uri?: string;
  animationUrl?: string;
  preview?: boolean;
  files?: (MetadataFile | string)[];
  artView?: boolean;
}) => {
  if (!artView) {
    return <CachedImageContent uri={uri} preview={preview} />;
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
    ></iframe>
  );
};

export const ArtContent = ({
  category,
  preview,
  card,
  active,
  allowMeshRender,
  pubkey,
  uri,
  animationURL,
  files,
  artView,
}: {
  category?: MetadataCategory;
  preview?: boolean;
  card?: boolean;
  active?: boolean;
  allowMeshRender?: boolean;
  pubkey?: PublicKey | string;
  uri?: string;
  animationURL?: string;
  files?: (MetadataFile | string)[];
  artView?: boolean;
}) => {
  const id = pubkeyToString(pubkey);

  const { ref, data } = useExtendedArt(id);

  if (pubkey && data) {
    uri = data.image;
    animationURL = data.animation_url;
  }

  if (pubkey && data?.properties) {
    files = data.properties.files;
    category = data.properties.category;
  }

  animationURL = animationURL || '';

  const animationUrlExt = new URLSearchParams(
    getLast(animationURL.split('?')),
  ).get('ext');

  if (
    allowMeshRender &&
    (category === 'vr' ||
      animationUrlExt === 'glb' ||
      animationUrlExt === 'gltf')
  ) {
    return (
      <MeshArtContent uri={uri} animationUrl={animationURL} files={files} />
    );
  }

  const content =
    category === 'video' || category === 'audio' ? (
      <VideoArtContent
        files={files}
        uri={uri}
        animationURL={animationURL}
        active={active}
      />
    ) : category === 'html' || animationUrlExt === 'html' ? (
      <HTMLContent
        uri={uri}
        animationUrl={animationURL}
        preview={preview}
        files={files}
        artView={artView}
      />
    ) : (
      <CachedImageContent uri={uri} preview={preview} />
    );

  return (
    <div className={`metaplex-art-content-${card ? 'card' : 'full'}`} ref={ref}>
      {content}
    </div>
  );
};
