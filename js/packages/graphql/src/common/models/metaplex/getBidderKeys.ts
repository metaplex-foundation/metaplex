import { AUCTION_PREFIX, METADATA } from '../auctions';
import { findProgramAddress, programIds, toPublicKey } from '../../utils';
import { getBidRedemption } from './getBidRedemption';

export async function getBidderKeys(
  auctionKey: string,
  bidder: string,
): Promise<{ bidMetadata: string; bidRedemption: string }> {
  const PROGRAM_IDS = programIds();

  const bidMetadata = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(PROGRAM_IDS.auction).toBuffer(),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(bidder).toBuffer(),
        Buffer.from(METADATA),
      ],
      toPublicKey(PROGRAM_IDS.auction),
    )
  )[0];

  const bidRedemption = await getBidRedemption(auctionKey, bidMetadata);

  return { bidMetadata, bidRedemption };
}
