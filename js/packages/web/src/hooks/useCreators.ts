import { useMemo } from 'react';
import { useMeta } from '../contexts';
import { Artist } from '../types';
import { AuctionView } from './useAuctions';

export const useCreators = (auction?: AuctionView) => {
  const { whitelistedCreatorsByCreator } = useMeta();

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
            agg.set(item.address, item.share);
            return agg;
          }, new Map<string, number>())
          .entries(),
      ].map(creatorArray => {
        const [creator, share] = creatorArray;
        const knownCreator = whitelistedCreatorsByCreator[creator];

        return {
          address: creator,
          verified: true,
          share: share,
          image: knownCreator?.info.image || '',
          name: knownCreator?.info.name || '',
          link: knownCreator?.info.twitter || '',
        } as Artist;
      }),
    [auction, whitelistedCreatorsByCreator],
  );

  return creators;
};
