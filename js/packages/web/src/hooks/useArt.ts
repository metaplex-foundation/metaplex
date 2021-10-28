import { useEffect, useState } from 'react';
import { Art, Artist, ArtType } from '../types';
import {
  IMetadataExtension,
  Metadata,
  ParsedAccount,
  StringPublicKey,
  useLocalStorage,
  pubkeyToString,
} from '@oyster/common';
import { WhitelistedCreator } from '@oyster/common/dist/lib/models/metaplex/index';
import { Cache } from 'three';
import {
  getCreator,
  getEditionsbyKey,
  getMasterEditionsbyKey,
  getMetdataByPubKey,
} from './getData';
import _ from 'lodash';

const metadataToArt = async (
  info: Metadata | undefined,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
) => {
  let type: ArtType = ArtType.NFT;
  let editionNumber: number | undefined = undefined;
  let maxSupply: number | undefined = undefined;
  let supply: number | undefined = undefined;

  if (info) {
    let masterEdition;
    if (info.masterEdition) {
      let res = await getMasterEditionsbyKey(
        'masterEditionsV2',
        info.masterEdition,
      );
      if (_.isEmpty(res)) {
        res = await getMasterEditionsbyKey(
          'masterEditionsV1',
          info.masterEdition,
        );
      }

      masterEdition = !_.isEmpty(res) ? res : undefined;
    }
    let edition;
    if (info.edition) edition = await getEditionsbyKey(info.edition);
    if (edition) {
      let myMasterEdition;
      if (edition.info.parent) {
        let res = await getMasterEditionsbyKey(
          'masterEditionsV2',
          edition.info.parent,
        );
        if (_.isEmpty(res)) {
          res = await getMasterEditionsbyKey(
            'masterEditionsV1',
            edition.info.parent,
          );
        }

        myMasterEdition = !_.isEmpty(res) ? res : undefined;
      }
      if (myMasterEdition) {
        type = ArtType.Print;
        editionNumber = edition.info.edition.toNumber();
        supply = myMasterEdition.info?.supply.toNumber() || 0;
      }
    } else if (masterEdition) {
      type = ArtType.Master;
      maxSupply = masterEdition.info.maxSupply?.toNumber();
      supply = masterEdition.info.supply.toNumber();
    }
  }

  return {
    uri: info?.data.uri || '',
    mint: info?.mint,
    title: info?.data.name,
    creators: (info?.data.creators || [])
      .map(creator => {
        const knownCreator = whitelistedCreatorsByCreator[creator.address];

        return {
          address: creator.address,
          verified: creator.verified,
          share: creator.share,
          image: knownCreator?.info.image || '',
          name: knownCreator?.info.name || '',
          link: knownCreator?.info.twitter || '',
        } as Artist;
      })
      .sort((a, b) => {
        const share = (b.share || 0) - (a.share || 0);
        if (share === 0) {
          return a.name.localeCompare(b.name);
        }

        return share;
      }),
    seller_fee_basis_points: info?.data.sellerFeeBasisPoints || 0,
    edition: editionNumber,
    maxSupply,
    supply,
    type,
  } as Art;
};

const cachedImages = new Map<string, string>();
export const useCachedImage = (uri: string, cacheMesh?: boolean) => {
  const [cachedBlob, setCachedBlob] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getImageBlobAsync = async () => {
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

    if (cacheMesh) {
      // extra caching for meshviewer
      Cache.enabled = true;
      Cache.add(uri, await blob.arrayBuffer());
    }
    const blobURI = URL.createObjectURL(blob);
    cachedImages.set(uri, blobURI);
    setCachedBlob(blobURI);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!uri) {
      return;
    }

    const result = cachedImages.get(uri);
    if (result) {
      setCachedBlob(result);
      return;
    }

    getImageBlobAsync();
  }, [uri, setCachedBlob, setIsLoading]);

  return { cachedBlob, isLoading };
};

export const useArt = (key?: StringPublicKey) => {
  const [account, setAccount] = useState<any>(null);
  const [CreatorsByCreator, setCreatorsByCreator] = useState<any>([]);
  const [art, setArt] = useState<any>({});

  const getMetdataByPubKeyAsync = async () => {
    if (!key) return;
    await getMetdataByPubKey(key).then(metadata => {
      if (metadata && metadata.length > 0) {
        setAccount(metadata[0]);
      }
    });
    await getCreator().then(creators => {
      if (creators && creators.length > 0) {
        setCreatorsByCreator(creators);
      }
    });
  };

  useEffect(() => {
    getMetdataByPubKeyAsync();
  }, [key]);

  useEffect(() => {
    metadataToArt(account?.info, CreatorsByCreator).then(value =>
      setArt(value),
    );
  }, [account, CreatorsByCreator]);
  return art;
};

export const useExtendedArt = (id?: StringPublicKey) => {
  const [data, setData] = useState<IMetadataExtension>();
  const [account, setAccount] = useState<any>(null);
  const localStorage = useLocalStorage();

  const key = pubkeyToString(id);

  useEffect(() => {
    if (!key) return;
    getMetdataByPubKey(key).then(metadata => {
      if (metadata && metadata.length > 0) {
        setAccount(metadata[0]);
      }
    });
  }, [key]);

  useEffect(() => {
    if (id && !data) {
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

      if (account && account.info.data.uri) {
        const uri = routeCDN(account.info.data.uri);

        const processJson = (extended: any) => {
          if (!extended || extended?.properties?.files?.length === 0) {
            return;
          }

          if (extended?.image) {
            const file = extended.image.startsWith('http')
              ? extended.image
              : `${account.info.data.uri}/${extended.image}`;
            extended.image = routeCDN(file);
          }

          return extended;
        };

        try {
          const cached = localStorage.getItem(uri);
          if (cached) {
            setData(processJson(JSON.parse(cached)));
          } else {
            // TODO: BL handle concurrent calls to avoid double query
            fetch(uri)
              .then(async _ => {
                try {
                  const data = await _.json();
                  try {
                    localStorage.setItem(uri, JSON.stringify(data));
                  } catch {
                    // ignore
                  }
                  setData(processJson(data));
                } catch {
                  return undefined;
                }
              })
              .catch(() => {
                return undefined;
              });
          }
        } catch (ex) {
          console.error(ex);
        }
      }
    }
  }, [id, data, setData, account]);

  return { data };
};
