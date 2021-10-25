import React, { useContext, useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { MintInfo } from '@solana/spl-token';
import { range } from 'lodash';
import { cache, MintParser, ParsedAccount, useConnection, useMeta } from '..';
import {
  CollectionContextState as CollectionsContextState,
  CollectionsState,
} from './types';
import {
  AuctionManager,
  AuctionManagerV1,
  AuctionManagerV2,
  BidRedemptionTicketV2,
  fromLamports,
  IMetadataExtension,
  Metadata,
  MetaplexKey,
  SafetyDepositBox,
  SafetyDepositConfig,
  StringPublicKey,
  useLocalStorage,
} from '../..';

const CollectionsContext = React.createContext<CollectionsContextState>({
  tokenMetadataByCollection: {},
  isLoading: false,
  update: () => {},
});

export function CollectionsProvider({ children = null as any }) {
  const {
    metadata,
    auctions,
    auctionManagersByAuction,
    vaults,
    safetyDepositConfigsByAuctionManagerAndIndex,
    bidRedemptionV2sByAuctionManagerAndWinningIndex,
    safetyDepositBoxesByVaultAndIndex,
    auctionDataExtended,
  } = useMeta();

  const connection = useConnection();

  const [state, setState] = useState<CollectionsState>({
    tokenMetadataByCollection: {},
  });
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const localStorage = useLocalStorage();

  const loadFileFromUri = async (uri: string) => {
    try {
      const cached = localStorage.getItem(uri);

      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed;
      } else {
        const rawResponse = await fetch(uri);

        try {
          const data = await rawResponse.json();

          try {
            localStorage.setItem(uri, JSON.stringify(data));
          } catch {
            // ignore
          }

          return data;
        } catch (ex) {
          return undefined;
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  };

  async function update() {
    setIsLoadingCollections(true);

    const promises = metadata.map(m => loadFileFromUri(m.info.data.uri));
    const results: Array<IMetadataExtension> = await Promise.all(promises);
    const records: Record<
      string,
      Array<{
        ParsedAccount: ParsedAccount<Metadata>;
        MetadataExtension: IMetadataExtension;
        Auction?: StringPublicKey;
        Price?: number;
      }>
    > = {};

    const auctionManagerMetadata = (
      await Promise.all(
        Object.values(auctionManagersByAuction).map(m =>
          getAuctionManagerMetadata(m),
        ),
      )
    ).filter(m => m);

    for (const i of range(0, metadata.length)) {
      const metadataExtension = results[i];
      if (!metadataExtension || !metadataExtension.collection) {
        continue;
      }

      const auctionInfo = auctionManagerMetadata.find(
        a => a!.Metadata?.pubkey == metadata[i].pubkey,
      );

      const record = {
        ParsedAccount: metadata[i],
        MetadataExtension: metadataExtension,
        Auction: auctionInfo?.Auction,
        Price: auctionInfo?.Price,
      };

      records[metadataExtension.collection.name] ||= [];
      records[metadataExtension.collection.name].push(record);
    }

    setState({ tokenMetadataByCollection: records });
    setIsLoadingCollections(false);
  }

  useEffect(() => {
    if (metadata.length > 0) update();
  }, [metadata]);

  async function getAuctionManagerMetadata(
    manager: ParsedAccount<AuctionManagerV2 | AuctionManagerV1>,
  ) {
    const vault = vaults[manager.info.vault];

    const safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[] =
      buildListWhileNonZero(
        safetyDepositConfigsByAuctionManagerAndIndex,
        manager.pubkey,
      );

    const bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[] =
      buildListWhileNonZero(
        bidRedemptionV2sByAuctionManagerAndWinningIndex,
        manager.pubkey,
      );

    const auctionManager = new AuctionManager({
      instance: manager,
      auction: auctions[manager.info.auction],
      vault,
      safetyDepositConfigs,
      bidRedemptions,
    });

    const boxes: ParsedAccount<SafetyDepositBox>[] = buildListWhileNonZero(
      safetyDepositBoxesByVaultAndIndex,
      manager.info.vault,
    );

    const items = await auctionManager.getItemsFromSafetyDepositBoxes(boxes);

    const auctionDataExtendedKey =
      manager.info.key == MetaplexKey.AuctionManagerV2
        ? (manager as ParsedAccount<AuctionManagerV2>).info.auctionDataExtended
        : null;

    const auctionDataExt = auctionDataExtendedKey
      ? auctionDataExtended[auctionDataExtendedKey]
      : null;

    const item = ((items || [])[0] || [])[0];

    const salePrice = auctionDataExt?.info?.instantSalePrice ?? 0;
    const auction = auctions[manager.info.auction];
    const auctionMint = await getMint(connection, auction.info.tokenMint);
    const number = fromLamports(salePrice!, auctionMint);

    return item && auctionDataExtended
      ? {
          Metadata: item.metadata,
          Auction: manager.info.auction,
          Price: number,
        }
      : null;
  }

  async function getMint(connection: Connection, key: string | PublicKey) {
    const acc = await cache.query(connection, key, MintParser);
    return acc.info as MintInfo;
  }

  return (
    <CollectionsContext.Provider
      value={{
        ...state,
        update,
        isLoading: isLoadingCollections,
      }}
    >
      {children}
    </CollectionsContext.Provider>
  );
}

export const useCollectionsContext = () => {
  const context = useContext(CollectionsContext);
  return context;
};

function buildListWhileNonZero<T>(hash: Record<string, T>, key: string) {
  const list: T[] = [];
  let ticket = hash[key + '-0'];
  if (ticket) {
    list.push(ticket);
    let i = 1;
    while (ticket) {
      ticket = hash[key + '-' + i.toString()];
      if (ticket) list.push(ticket);
      i++;
    }
  }
  return list;
}
