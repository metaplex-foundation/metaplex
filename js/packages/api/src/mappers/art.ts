import { Metadata } from '@oyster/common';
import { MetaState } from '@oyster/common/dist/lib/contexts/meta/types';

export const artEditions = (item: Metadata, state: MetaState) => {
  const edition = state.editions[item.edition!];
  const meEdition = state.masterEditions[edition?.info.parent];
  const masterEdition = state.masterEditions[item.masterEdition!];
  return { edition, meEdition, masterEdition };
};

export const artType = (item: Metadata, state: MetaState) => {
  const { meEdition, masterEdition } = artEditions(item, state);
  if (meEdition) {
    return 1;
  }
  if (masterEdition) {
    return 0;
  }
  return 2;
};

export const artEditionNumber = (item: Metadata, state: MetaState) => {
  const { edition, meEdition } = artEditions(item, state);
  return meEdition ? edition?.info.edition : undefined;
};

export const artSupply = (item: Metadata, state: MetaState) => {
  const { meEdition, masterEdition } = artEditions(item, state);
  return meEdition?.info.supply || masterEdition.info.supply;
};

export const artMaxSupply = (item: Metadata, state: MetaState) => {
  const { masterEdition } = artEditions(item, state);
  return masterEdition?.info.maxSupply;
};
