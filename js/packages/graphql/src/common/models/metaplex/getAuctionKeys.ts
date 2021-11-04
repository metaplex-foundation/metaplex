import { AUCTION_PREFIX } from '../auctions';
import { findProgramAddress, programIds, toPublicKey } from '../../utils';
import { getAuctionManagerKey } from './getAuctionManagerKey';

export async function getAuctionKeys(
  vault: string,
): Promise<{ auctionKey: string; auctionManagerKey: string }> {
  const PROGRAM_IDS = programIds();

  const auctionKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(PROGRAM_IDS.auction).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.auction),
    )
  )[0];

  const auctionManagerKey = await getAuctionManagerKey(vault, auctionKey);

  return { auctionKey, auctionManagerKey };
}
