import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { AUCTION_PREFIX, EXTENDED } from './constants';

export async function getAuctionExtended({
  auctionProgramId,
  resource,
}: {
  auctionProgramId: StringPublicKey;
  resource: StringPublicKey;
}): Promise<StringPublicKey> {
  return (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(resource).toBuffer(),
        Buffer.from(EXTENDED),
      ],
      toPublicKey(auctionProgramId),
    )
  )[0];
}
