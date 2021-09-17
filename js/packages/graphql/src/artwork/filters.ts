import type { TokenAccount } from "../common";
import { MetaplexApi } from "../api";
import { NexusGenInputs } from "../generated/typings";
import { Artwork } from "../sourceTypes";

export const filterByStoreAndCreator = async (
  {
    storeId,
    creatorId,
    onlyVerified,
  }: Pick<
    NexusGenInputs["ArtworksInput"],
    "storeId" | "creatorId" | "onlyVerified"
  >,
  api: MetaplexApi
) => {
  const storeCreators = await api.getCreators(storeId);

  const creator =
    (creatorId && storeCreators.find(({ address }) => address === creatorId)) ||
    null;

  return ({ data }: Artwork) => {
    return data.creators?.some(({ address, verified }) => {
      const inStore = storeCreators.some(
        (creator) => creator.address === address
      );
      const fromCreator = creator && address === creator.address;

      return (
        (!onlyVerified || verified) &&
        (!storeId || inStore) &&
        (!creatorId || fromCreator)
      );
    });
  };
};

export const filterByOwner = async (
  { ownerId }: Pick<NexusGenInputs["ArtworksInput"], "ownerId">,
  api: MetaplexApi
) => {
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
};
