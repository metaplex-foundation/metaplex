import { Connection } from '@solana/web3.js';

import { getMultipleAccounts } from '../accounts/getMultipleAccounts';
import { AuctionManagerV1, AuctionManagerV2 } from '../../models';
import { ParsedAccount } from '../accounts/types';
import { AccountAndPubkey } from './types';

type AuctionManagerByAuction = Record<
  string,
  ParsedAccount<AuctionManagerV1 | AuctionManagerV2>
>;

interface IPullAuctionsParams {
  connection: Connection;
  auctionManagersByAuction: AuctionManagerByAuction;
}

export const pullAuctions = async ({
  connection,
  auctionManagersByAuction,
}: IPullAuctionsParams) => {
  const IDS_PER_CHUNK = 100;
  const auctionIdsChunks = [
    ...chunks(
      getAuctionsIdsByAuctionManager(auctionManagersByAuction),
      IDS_PER_CHUNK,
    ),
  ];

  const auctionsChunks = await Promise.all(
    auctionIdsChunks.map(ids =>
      pullAuctionsByAuctionManager({ ids, connection }),
    ),
  );

  return auctionsChunks.flat();
};

const getAuctionsIdsByAuctionManager = (
  auctionManagersByAuction: AuctionManagerByAuction,
) =>
  Object.values(auctionManagersByAuction).reduce((ids, { info }) => {
    ids.push(info.auction);

    if (isAuctionManagerV2(info) && info?.auctionDataExtended) {
      ids.push(info.auctionDataExtended);
    }

    return ids;
  }, [] as string[]);

const pullAuctionsByAuctionManager = ({
  connection,
  ids,
}: {
  connection: Connection;
  ids: string[];
}): Promise<AccountAndPubkey[]> => {
  return getMultipleAccounts(connection, ids, 'single').then(
    ({ keys, array }) =>
      keys.map((pubkey, i) => ({
        pubkey,
        account: array[i],
      })),
  );
};

function* chunks(array: string[], chunkSize: number) {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

const isAuctionManagerV2 = (
  auctionManager: AuctionManagerV1 | AuctionManagerV2,
): auctionManager is AuctionManagerV2 => {
  return (auctionManager as AuctionManagerV2).auctionDataExtended !== undefined;
};
