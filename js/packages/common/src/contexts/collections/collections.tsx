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
import {
  getAuction,
  getAuctionDataExtended,
  getAuctionDataExtendedByKey,
  getBidRedemptionV2sByAuctionManagerAndWinningIndexby,
  getCollections,
  getMetadata,
  getSafetyDepositBoxesByVaultAndIndexby,
  getSafetyDepositConfigsByAuctionManagerAndIndexby,
  getVault,
} from '../../hooks/getData';

const CollectionsContext = React.createContext<CollectionsContextState>({
  tokenMetadataByCollection: {},
  isLoading: false,
  update: () => {},
});

export function CollectionsProvider({ children = null as any }) {
  const [metadata, setMetadata] = useState<ParsedAccount<Metadata>[]>([]);

  const getMetadataAsync = async () => {
    const metadata = await getMetadata();
    setMetadata(metadata);
  };

  useEffect(() => {
    getMetadataAsync();
  }, []);

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

    const promises = Object.values(metadata).map(m => {
      return loadFileFromUri(m.info.data.uri);
    });
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

    const auctionManagersByAuction = await getCollections();
    const auctionManagerMetadata = (
      await Promise.all(
        Object.values(auctionManagersByAuction).map((m: any) =>
          getAuctionManagerMetadata(m),
        ),
      )
    ).filter(m => m);

    for (const i of range(0, metadata?.length)) {
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
    if (metadata?.length > 0) {
      update();
    }
  }, [metadata]);

  async function getAuctionManagerMetadata(
    manager: ParsedAccount<AuctionManagerV2 | AuctionManagerV1>,
  ) {
    const vault = await getVault(manager.info.vault);

    const safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[] =
      await buildListWhileNonZero('safety', manager.pubkey);

    const bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[] =
      await buildListWhileNonZero('bidRed', manager.pubkey);

    const auc = await getAuction(manager.info.auction);
    const auctionManager = new AuctionManager({
      instance: manager,
      auction: auc,
      vault,
      safetyDepositConfigs,
      bidRedemptions,
    });

    const boxes: ParsedAccount<SafetyDepositBox>[] =
      await buildListWhileNonZero('vault', manager.info.vault);

    const items = await auctionManager.getItemsFromSafetyDepositBoxes(boxes);

    const auctionDataExtendedKey =
      manager.info.key == MetaplexKey.AuctionManagerV2
        ? (manager as ParsedAccount<AuctionManagerV2>).info.auctionDataExtended
        : null;

    const auctionDataExt = auctionDataExtendedKey
      ? await getAuctionDataExtendedByKey(auctionDataExtendedKey)
      : null;

    const item = ((items || [])[0] || [])[0];

    const salePrice = auctionDataExt?.info?.instantSalePrice ?? 0;
    const auction = await getAuction(manager.info.auction);
    const auctionMint = await getMint(connection, auction.info.tokenMint);
    const number = fromLamports(salePrice!, auctionMint);

    let getAuctionData = undefined;
    if (item) getAuctionData = await getAuctionDataExtended();

    return getAuctionData
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

async function buildListWhileNonZero<T>(hash: string, key: string) {
  const list: T[] = [];
  let ticket;
  if (hash == 'vault')
    ticket = await getSafetyDepositBoxesByVaultAndIndexby(key, '0');
  else if (hash == 'safety')
    ticket = await getSafetyDepositConfigsByAuctionManagerAndIndexby(key, '0');
  else if (hash == 'bidRed') {
    ticket = await getBidRedemptionV2sByAuctionManagerAndWinningIndexby(
      key,
      '0',
    );
  }
  return list;
}
