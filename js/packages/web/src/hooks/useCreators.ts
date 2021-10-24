import { useMemo, useState, useEffect } from 'react';
import { useMeta } from '../contexts';
import { Artist } from '../types';
import { AuctionView } from './useAuctions';
import { getHandleAndRegistryKey } from '@solana/spl-name-service';
import { PublicKey, Connection } from '@solana/web3.js';
import { useConnection } from '@oyster/common';
export const useCreators = (auction?: AuctionView) => {
  const { whitelistedCreatorsByCreator } = useMeta();
  const connection = useConnection();
  const [bidderTwitterHandles, setBidderTwitterHandles] = useState({});

  const creators = useMemo(
    () =>
      [
        ...(
          [
            ...(auction?.items || []).flat().map(item => item?.metadata),
            auction?.participationItem?.metadata,
          ]
            .filter(item => item && item.info)
            .map(item => item?.info.data.creators || [])
            .flat() || []
        )
          .filter(creator => creator.verified)
          .reduce((agg, item) => {
            agg.add(item.address);
            return agg;
          }, new Set<string>())
          .values(),
      ].map((creator, index, arr) => {
        const knownCreator = whitelistedCreatorsByCreator[creator];

        return {
          address: creator,
          verified: true,
          // not exact share of royalties
          share: (1 / arr.length) * 100,
          image: '',
          name: bidderTwitterHandles[creator] || '',
          link: `https://twitter.com/${bidderTwitterHandles[creator]}` || '',
        } as Artist;
      }),
    [auction, whitelistedCreatorsByCreator],
  );
  useEffect(() => {
    const getTwitterHandle = async (
      connection: Connection,
      creators: any,
    ): Promise<any | undefined> => {
      let toreturn = {};
      for (var c in creators) {
        try {
          const [twitterHandle] = await getHandleAndRegistryKey(
            connection,
            new PublicKey(c),
          );
          toreturn[c] = twitterHandle;
        } catch (err) {
          console.warn(`err`);
          toreturn[c] = '';
        }
      }
      return toreturn;
    };
    getTwitterHandle(connection, creators);
  }, [bidderTwitterHandles]);
  return creators;
};
