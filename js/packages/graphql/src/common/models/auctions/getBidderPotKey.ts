import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { AUCTION_PREFIX } from './constants';

export async function getBidderPotKey({
  auctionProgramId,
  auctionKey,
  bidderPubkey,
}: {
  auctionProgramId: StringPublicKey;
  auctionKey: StringPublicKey;
  bidderPubkey: StringPublicKey;
}): Promise<StringPublicKey> {
  return (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(bidderPubkey).toBuffer(),
      ],
      toPublicKey(auctionProgramId),
    )
  )[0];
}
