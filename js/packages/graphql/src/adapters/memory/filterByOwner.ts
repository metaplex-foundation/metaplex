import { NexusGenInputs } from "../../generated/typings";
import { Metadata, TokenAccount } from "../../common";
import { Reader } from "../../reader";

// artwork
export async function filterByOwner(
  { ownerId }: Pick<NexusGenInputs["ArtworksInput"], "ownerId">,
  loadUserAccounts: InstanceType<typeof Reader>["loadUserAccounts"]
) {
  let userAccounts: TokenAccount[] = [];
  if (ownerId) {
    userAccounts = await loadUserAccounts(ownerId);
  }

  return ({ mint }: Metadata) => {
    return (
      !ownerId ||
      userAccounts.some(
        ({ info }) =>
          info.mint.toBase58() === mint && info.amount.toNumber() > 0
      )
    );
  };
}
