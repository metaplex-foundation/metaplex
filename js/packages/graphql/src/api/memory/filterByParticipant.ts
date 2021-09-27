import { MetaState } from "../../common";
import { NexusGenInputs } from "../../generated/typings";
import { Auction } from "types/sourceTypes";

export function filterByParticipant(
  { participantId }: Pick<NexusGenInputs["AuctionsInput"], "participantId">,
  state: MetaState
) {
  const bidders = Array.from(state.bidderMetadataByAuctionAndBidder.values());
  return (auction: Auction) => {
    if (!participantId) {
      return true;
    }
    for (const { info } of bidders) {
      if (
        info.auctionPubkey == auction.pubkey &&
        info.bidderPubkey === participantId
      ) {
        return true;
      }
    }
    return false;
  };
}
