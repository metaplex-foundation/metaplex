import { Stream, StreamPlayerApi } from '@cloudflare/stream-react';
import { MetadataCategory, MetadataFile, pubkeyToString } from '@oyster/common';
import { PublicKey } from '@solana/web3.js';
import Loading from 'react-loading';
import { Image } from 'antd';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import cx from 'classnames';
import { useCachedImage, useExtendedArt } from '../../hooks';
import { getLast } from '../../utils/utils';
import { MeshViewer } from '../MeshViewer';
import { maybeCDN } from '../../utils/cdn';

const MeshArtContent = ({
  uri,
  animationUrl,
  files,
  backdrop,
}: {
  uri?: string;
  animationUrl?: string;
  files?: (MetadataFile | string)[];
  backdrop: string;
}) => {
  const renderURL =
    files && files.length > 0 && typeof files[0] === 'string'
      ? files[0]
      : animationUrl;

  const { isLoading } = useCachedImage(renderURL || '', true);

  if (isLoading) {
    return <CachedImageContent backdrop={backdrop} uri={uri} preview={false} />;
  }

  return (
    <div className="metaplex-mesh-art-content">
      <MeshViewer url={renderURL} />
    </div>
  );
};

const CachedImageContent = ({
  uri,
  preview,
  backdrop = 'dark',
}: {
  uri?: string;
  preview?: boolean;
  backdrop: string;
}) => {
  const { cachedBlob, isLoading } = useCachedImage(uri || '');

  return (
    <Image
      preview={preview}
      src={cachedBlob}
      wrapperClassName={cx('metaplex-image', `metaplex-loader-${backdrop}`, {
        'metaplex-image-loading': isLoading,
      })}
      loading="lazy"
      placeholder={<Loading type="bars" color="inherit" />}
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
        {animationURL && <source src={maybeCDN(animationURL)} type="video/mp4" />}
        {(
          files?.filter(f => !!f && typeof f !== 'string') as MetadataFile[]
        )?.map((f: MetadataFile, i) => (
          <source key={i} src={f.uri} type={f.type} />
        ))}
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
  backdrop,
}: {
  uri?: string;
  animationUrl?: string;
  preview?: boolean;
  files?: (MetadataFile | string)[];
  artView?: boolean;
  backdrop: string;
}) => {
  if (!artView) {
    return (
      <CachedImageContent backdrop={backdrop} uri={uri} preview={preview} />
    );
  }
  const htmlURL =
    files && files.length > 0 && typeof files[0] === 'string'
      ? files[0]
      : animationUrl;
  return (
    <div className="metaplex-html-content">
      <iframe
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-scripts"
        frameBorder="0"
        src={htmlURL}
      ></iframe>
    </div>
  );
};

export const ArtContent = ({
  category,
  preview,
  active,
  allowMeshRender,
  pubkey,
  uri,
  animationURL,
  files,
  artView,
  backdrop,
  square,
}: {
  category?: MetadataCategory;
  preview?: boolean;
  active?: boolean;
  allowMeshRender?: boolean;
  pubkey?: PublicKey | string;
  uri?: string;
  animationURL?: string;
  files?: (MetadataFile | string)[];
  artView?: boolean;
  backdrop: 'dark' | 'light';
  square: boolean;
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

  const squareAspect = square || animationURL !== '';

  const animationUrlExt = new URLSearchParams(
    getLast(animationURL.split('?')),
  ).get('ext');

  let content: ReactElement;

  if (category === 'video' || category === 'audio') {
    content = (
      <VideoArtContent
        files={files}
        uri={uri}
        animationURL={animationURL}
        active={active}
      />
    );
  } else if (category === 'html' || animationUrlExt === 'html') {
    content = (
      <HTMLContent
        uri={uri}
        animationUrl={animationURL}
        preview={preview}
        files={files}
        artView={artView}
        backdrop={backdrop}
      />
    );
  } else if (
    allowMeshRender &&
    (category === 'vr' ||
      animationUrlExt === 'glb' ||
      animationUrlExt === 'gltf')
  ) {
    content = (
      <MeshArtContent
        backdrop={backdrop}
        uri={uri}
        animationUrl={animationURL}
        files={files}
      />
    );
  } else {
    content = (
      <CachedImageContent backdrop={backdrop} uri={uri} preview={preview} />
    );
  }

  return (
    <div
      className={cx('metaplex-art-content', {
        'metaplex-square-aspect': squareAspect,
      })}
      ref={ref}
    >
      {content}
    </div>
  );
};
