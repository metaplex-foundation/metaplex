import { AuctionView, AuctionViewState } from './useAuctions';
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';
import { useAuctionsList } from '../views/home/components/SalesList/hooks/useAuctionsList';
import { LiveAuctionViewState } from '../views/home/components/SalesList';
import { useEffect, useState } from 'react';
import { StringPublicKey, useMeta } from '@oyster/common';

export interface CollectionView {
  pubkey: StringPublicKey;
  mint: StringPublicKey;
  data: MetadataData;
  state: AuctionViewState;
}

export const useCollections = () => {
  const { auctions: liveAuctions } = useAuctionsList(LiveAuctionViewState.All);
  const { auctions: endedAuctions } = useAuctionsList(
    LiveAuctionViewState.Ended,
  );

  const { metadataByCollection } = useMeta();

  const [liveCollections, setLiveCollections] = useState<CollectionView[]>([]);
  const [endedCollections, setEndedCollections] = useState<CollectionView[]>(
    [],
  );

  const setCollections = (
    auctions: AuctionView[],
    setStateFunc: (c: CollectionView[]) => void,
    filterMints?: CollectionView[],
  ) => {
    const usedCollections = new Set<string>(filterMints?.map(c => c.mint));
    const collections: CollectionView[] = [];
    auctions.forEach(auction => {
      const collection = auction?.thumbnail?.metadata?.info?.collection?.key;
      if (collection && !usedCollections.has(collection)) {
        const metadata = metadataByCollection[collection];
        if (metadata) {
          usedCollections.add(collection);
          collections.push({
            pubkey: metadata.pubkey,
            mint: collection,
            data: metadata.info as unknown as MetadataData,
            state: auction.state,
          });
        }
      }
    });
    setStateFunc(collections);
  };

  useEffect(() => {
    setCollections(liveAuctions, setLiveCollections);
  }, [liveAuctions]);

  useEffect(() => {
    setCollections(endedAuctions, setEndedCollections, liveCollections);
  }, [endedAuctions, liveCollections]);

  return { liveCollections, endedCollections };
};
