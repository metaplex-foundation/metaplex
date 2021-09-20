import { MetaState } from "../common";
import { Artwork } from "../types/sourceTypes";

export const artEditions = (item: Artwork, state: MetaState) => {
  const edition = item.edition ? state.editions.get(item.edition) : undefined;
  const meEdition = edition?.info.parent
    ? state.masterEditions.get(edition?.info.parent)
    : undefined;
  const masterEdition = item.masterEdition
    ? state.masterEditions.get(item.masterEdition)
    : undefined;
  return { edition, meEdition, masterEdition };
};

export const artType = (item: Artwork, state: MetaState) => {
  const { meEdition, masterEdition } = artEditions(item, state);
  if (meEdition) {
    return 1;
  }
  if (masterEdition) {
    return 0;
  }
  return 2;
};

export const artEditionNumber = (item: Artwork, state: MetaState) => {
  const { edition, meEdition } = artEditions(item, state);
  return meEdition ? edition?.info.edition : undefined;
};

export const artSupply = (item: Artwork, state: MetaState) => {
  const { meEdition, masterEdition } = artEditions(item, state);
  return meEdition?.info.supply || masterEdition?.info.supply;
};

export const artMaxSupply = (item: Artwork, state: MetaState) => {
  const { masterEdition } = artEditions(item, state);
  return masterEdition?.info.maxSupply;
};
