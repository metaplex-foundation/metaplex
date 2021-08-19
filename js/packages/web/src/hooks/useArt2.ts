import { IMetadataExtension, StringPublicKey } from '@oyster/common';
import { useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Cache } from 'three';
import { useMeta } from '../contexts';

const cachedImages = new Map<string, string>();
export const useCachedImage = (uri: string, cacheMesh?: boolean) => {
  const [cachedBlob, setCachedBlob] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
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
      try {
        response = await fetch(uri, { cache: 'force-cache' });
      } catch {
        try {
          response = await fetch(uri, { cache: 'reload' });
        } catch {
          // If external URL, just use the uri
          if (uri?.startsWith('http')) {
            setCachedBlob(uri);
          }
          setIsLoading(false);
          return;
        }
      }

      const blob = await response.blob();
      if (cacheMesh) {
        // extra caching for meshviewer
        Cache.enabled = true;
        Cache.add(uri, await blob.arrayBuffer());
      }
      const blobURI = URL.createObjectURL(blob);
      cachedImages.set(uri, blobURI);
      setCachedBlob(blobURI);
      setIsLoading(false);
    })();
  }, [uri, setCachedBlob, setIsLoading]);

  return { cachedBlob, isLoading };
};

// XXX: may be move to api
export const useExtendedArt = (contentUri?: string) => {
  const [data, setData] = useState<IMetadataExtension>();
  const [fetcher, setFetcher] = useState<Promise<any> | null>(null);
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && contentUri && !data) {
      const uri = routeCDN(contentUri);

      try {
        const cached = localStorage.getItem(uri);
        if (cached) {
          setData(processJson(JSON.parse(cached), uri));
        } else if (!fetcher) {
          const fetcher = fetch(uri)
            .then(_ => _.json())
            .then(data => {
              setData(processJson(data, uri));
              localStorage.setItem(uri, JSON.stringify(data));
            })
            .catch(() => undefined);
          setFetcher(fetcher);
        }
      } catch (ex) {
        console.error(ex);
      }
    }
  }, [inView, data, setData, contentUri]);

  return { ref, data };
};

const USE_CDN = false;
const routeCDN = (uri: string) => {
  let result = uri;
  if (USE_CDN) {
    result = uri.replace(
      'https://arweave.net/',
      'https://coldcdn.com/api/cdn/bronil/',
    );
  }

  return result;
};

const processJson = (extended: any, uri: string) => {
  if (extended?.properties?.files?.length === 0) {
    return;
  }

  if (extended?.image) {
    const file = extended.image.startsWith('http')
      ? extended.image
      : `${uri}/${extended.image}`;
    extended.image = routeCDN(file);
  }

  return extended;
};
