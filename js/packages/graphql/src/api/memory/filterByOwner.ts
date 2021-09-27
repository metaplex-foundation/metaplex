import { NexusGenInputs } from "../../generated/typings";
import { TokenAccount } from "../../common";
import { Artwork } from "types/sourceTypes";
import { MemoryApi } from "./MemoryApi";

// artwork
export async function filterByOwner(
  { ownerId }: Pick<NexusGenInputs["ArtworksInput"], "ownerId">,
  api: MemoryApi
) {
  let userAccounts: TokenAccount[] = [];
  if (ownerId) {
    userAccounts = await api.loadUserAccounts(ownerId);
  }

  return ({ mint }: Artwork) => {
    return (
      !ownerId ||
      userAccounts.some(
        ({ info }) =>
          info.mint.toBase58() === mint && info.amount.toNumber() > 0
      )
    );
  };
}
