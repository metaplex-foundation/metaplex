import { Connection } from '@solana/web3.js';

import { getMultipleAccounts } from '../accounts/getMultipleAccounts';
import { AuctionManagerV1, AuctionManagerV2 } from '../../models';
import { ParsedAccount } from '../accounts/types';
import { AUCTION_ID } from '../../utils/ids';
import { BIDDER_METADATA_LEN, BIDDER_POT_LEN } from '../../actions';
import { getProgramAccounts } from './web3';
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

  const auctionsChunks = auctionIdsChunks.map(ids =>
    pullAuctionsByAuctionManager({ ids, connection }),
  );

  const bidderMetadata = getProgramAccounts(connection, AUCTION_ID, {
    filters: [
      // Filter for BidderMetadata by data size
      {
        dataSize: BIDDER_METADATA_LEN,
      },
    ],
  });

  const bidderPots = getProgramAccounts(connection, AUCTION_ID, {
    filters: [
      // Filter for BidderPot by data size
      {
        dataSize: BIDDER_POT_LEN,
      },
    ],
  });

  return Promise.all([...auctionsChunks, bidderMetadata, bidderPots]);
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

const pullAuctionsByAuctionManager = async ({
  connection,
  ids,
}: {
  connection: Connection;
  ids: string[];
}): Promise<AccountAndPubkey[]> =>
  getMultipleAccounts(connection, ids, 'single').then(({ keys, array }) =>
    keys.map((pubkey, i) => ({
      pubkey,
      account: array[i],
    })),
  );

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
