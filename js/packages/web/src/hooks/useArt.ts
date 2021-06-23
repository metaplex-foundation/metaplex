import React, { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useMeta } from '../contexts';
import { Art, Artist, ArtType } from '../types';
import {
  Edition,
  MasterEdition,
  Metadata,
  ParsedAccount,
} from '@oyster/common';
import { WhitelistedCreator } from '../models/metaplex';

const metadataToArt = (
  info: Metadata | undefined,
  editions: Record<string, ParsedAccount<Edition>>,
  masterEditions: Record<string, ParsedAccount<MasterEdition>>,
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
    const masterEdition = masterEditions[info.masterEdition?.toBase58() || ''];
    const edition = editions[info.edition?.toBase58() || ''];
    if (edition) {
      const myMasterEdition =
        masterEditions[edition.info.parent.toBase58() || ''];
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
    image: info?.extended?.image,
    uri: info?.data.uri || '',
    mint: info?.mint.toBase58(),
    category: info?.extended?.properties?.category,
    title: info?.data.name,
    files: info?.extended?.properties.files,
    about: info?.extended?.description,
    creators: (info?.data.creators || [])
      .map(creator => {
        const knownCreator =
          whitelistedCreatorsByCreator[creator.address.toBase58()];

        return {
          address: creator.address.toBase58(),
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
    seller_fee_basis_points: info?.extended?.seller_fee_basis_points || 0,
    edition: editionNumber,
    maxSupply,
    supply,
    type,
  } as Art;
};

const cachedImages = new Map<string, string>();
export const useCachedImage = (uri: string) => {
  const [cachedBlob, setCachedBlob] = useState<string | undefined>(undefined);

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
          return;
        }
      }

      const blob = await response.blob();
      const blobURI = URL.createObjectURL(blob);
      cachedImages.set(uri, blobURI);
      setCachedBlob(blobURI);
    })();
  }, [uri, setCachedBlob]);

  return cachedBlob;
};

export const useArt = (id?: PublicKey | string) => {
  const { metadata, editions, masterEditions, whitelistedCreatorsByCreator } =
    useMeta();

  const key = typeof id === 'string' ? id : id?.toBase58() || '';

  const account = useMemo(
    () => metadata.find(a => a.pubkey.toBase58() === key),
    [key, metadata],
  );

  const [art, setArt] = useState(
    metadataToArt(
      account?.info,
      editions,
      masterEditions,
      whitelistedCreatorsByCreator,
    ),
  );

  // TODO: BL -> move to lazy load on display
  useEffect(() => {
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

      const processJson = (data: any) => {
        account.info.extended = data;

        if (
          !account.info.extended ||
          account.info.extended?.properties?.files?.length === 0
        ) {
          return;
        }

        if (account.info.extended?.image) {
          const file = account.info.extended.image.startsWith('http')
            ? account.info.extended.image
            : `${account.info.data.uri}/${account.info.extended.image}`;
          account.info.extended.image = routeCDN(file);
          setArt(
            metadataToArt(
              account?.info,
              editions,
              masterEditions,
              whitelistedCreatorsByCreator,
            ),
          );
        }
      };

      try {
        const cached = localStorage.getItem(uri);
        if (cached) {
          processJson(JSON.parse(cached));
        }
      } catch (ex) {
        console.error(ex);
      }

      if (!account.info.extended) {
        // try to query if not in local cache
        fetch(uri)
          .then(async _ => {
            try {
              const data = await _.json();
              localStorage.setItem(uri, JSON.stringify(data));
              processJson(data);
            } catch {
              return undefined;
            }
          })
          .catch(() => {
            return undefined;
          });
      }
    }
  }, [account, setArt]);

  return art;
};
