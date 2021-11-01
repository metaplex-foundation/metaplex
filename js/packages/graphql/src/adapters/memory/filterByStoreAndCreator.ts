import { Metadata, WhitelistedCreator } from "../../common";
import { NexusGenInputs } from "../../generated/typings";

export function filterByStoreAndCreator(
  {
    storeId,
    creatorId,
    onlyVerified,
  }: Pick<
    NexusGenInputs["ArtworksInput"],
    "storeId" | "creatorId" | "onlyVerified"
  >,
  storeCreators: WhitelistedCreator[]
) {
  const creator =
    (creatorId && storeCreators.find(({ address }) => address === creatorId)) ||
    null;

  return ({ data }: Metadata) => {
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
}
