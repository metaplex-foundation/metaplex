import React from 'react';
import ContentLoader from 'react-content-loader';

import { Image } from 'antd';

import fallbackSvg from './image-placeholder.svg';

export const CachedImageContent = ({
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
  const { cachedBlob } = useCachedImage(uri || '');

  return (
    <Image
      fallback={fallbackSvg}
      src={cachedBlob}
      preview={preview}
      wrapperClassName={className}
      loading="lazy"
      wrapperStyle={{ ...style }}
      placeholder={<ThreeDots />}
    />
  );
};

export const DataUrlImageContent = ({
  data,
  className,
  preview,
  style,
}: {
  data?: string;
  className?: string;
  preview?: boolean;
  style?: React.CSSProperties;
}) => {
  return (
    <Image
      fallback={fallbackSvg}
      src={data}
      preview={preview}
      wrapperClassName={className}
      loading="lazy"
      wrapperStyle={{ ...style }}
      placeholder={<ThreeDots />}
    />
  );
};

export const ThreeDots = ({ style }: { style?: React.CSSProperties }) => (
  <ContentLoader
    viewBox="0 0 212 200"
    height={200}
    width={212}
    backgroundColor="transparent"
    style={{
      width: '100%',
      margin: 'auto',
      ...style,
    }}
  >
    <circle cx="86" cy="100" r="8" />
    <circle cx="106" cy="100" r="8" />
    <circle cx="126" cy="100" r="8" />
  </ContentLoader>
);

const cachedImages = new Map<string, string>();
export const useCachedImage = (uri: string) => {
  const [cachedBlob, setCachedBlob] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (!uri) {
      return;
    }

    const result = cachedImages.get(uri);

    if (result) {
      setCachedBlob(result);
      return;
    }

    (async () => {
      let response: Response;
      let blob: Blob;
      try {
        response = await fetch(uri, { cache: 'force-cache' });

        blob = await response.blob();

        if (blob.size === 0) {
          throw new Error('No content');
        }
      } catch {
        try {
          response = await fetch(uri, { cache: 'reload' });
          blob = await response.blob();
        } catch {
          // If external URL, just use the uri
          if (uri?.startsWith('http')) {
            setCachedBlob(uri);
          }
          setIsLoading(false);
          return;
        }
      }

      if (blob.size === 0) {
        setIsLoading(false);
        return;
      }

      const blobURI = URL.createObjectURL(blob);
      cachedImages.set(uri, blobURI);
      setCachedBlob(blobURI);
      setIsLoading(false);
    })();
  }, [uri, setCachedBlob, setIsLoading]);

  return { cachedBlob, isLoading };
};
