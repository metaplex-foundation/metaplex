import React, { Ref, useState } from 'react';
import { Image } from 'antd';
import { MetadataCategory } from '@oyster/common';
import { MeshViewer } from '../MeshViewer';
import { ThreeDots } from '../MyLoader';
import { useCachedImage } from '../../hooks';

const HACK_LOOKUP: Record<string, string> = {
  'https://arweave.net/BPJbVgBUCwDLALLruex_5cmXvffXvcCwwweoiJ45BUM':
    'https://watch.videodelivery.net/01c2892dc406033a0dfbaf4ab883e448',
  'https://arweave.net/__2eOiYv0w-2_ayLUxqiSBQZeC9z5qcJPbeSE657Dcw':
    'https://watch.videodelivery.net/0af8af868293c5a6b6aad8ea2f9b985c',
  'https://arweave.net/0PiQ1Iybbp07nLXXj2w2OzmE2BA9VAxu_sBPUkfjCX8':
    'https://watch.videodelivery.net/bd9fbed75d9d58dbd9520cdbb7a407ae',
  'https://arweave.net/yftUPSwuKEyfazIi_vfKCSE-JrghtDDKfTbq0d-dmJ4':
    'https://watch.videodelivery.net/acd90bc0d6bd75565eca507fb69c7263',
  'https://arweave.net/9Dd_JTurpzTPiz1prvNpS-PexkahCLTeXLVXUIT0qbE':
    'https://watch.videodelivery.net/d90b177c2f77eab0fd70dec688d12d72',
  'https://arweave.net/WNLzR36v80IS61yeWyPYstF3qacWDXcDmYLp-RldYFQ':
    'https://watch.videodelivery.net/0cb4b80b5a668072c9f3a0a4224628f6',
  'https://arweave.net/PHEyKMsLA0AfjLt0UyGyOa9NBSgJuKT2wHxcPca-Qs8':
    'https://watch.videodelivery.net/a2a5deeafed881d67aed547f7ffaa03d',
  'https://arweave.net/5A8KJmRh2qYBNFdO0ChgJ_0Jx0ZgOFSatU2ffJg4SrA':
    'https://watch.videodelivery.net/3e5eadb976fab8fe7330a760941a960f',
};

export const ArtContent = ({
  uri,
  extension,
  category,
  className,
  preview,
  style,
  files,
  width,
  height,
  ref,
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
}) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const src = useCachedImage(uri || '');

  if (extension?.endsWith('.glb') || category === 'vr') {
    return <MeshViewer url={uri} className={className} style={style} />;
  }
  const likelyVideo = (files || []).filter((f, index, arr) => {
    // TODO: filter by fileType
    return arr.length >= 2 ? index === 1 : index === 0;
  })[0];

  return category === 'video' ? (
    HACK_LOOKUP[likelyVideo] ? (
      <iframe
        src={HACK_LOOKUP[likelyVideo]}
        style={{ border: 'none', ...style }}
        width={width}
        onLoad={obj => {
          //obj.target.addEventListener('click', () => ref?.current?.click());
        }}
        height={height}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen={true}
      ></iframe>
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
