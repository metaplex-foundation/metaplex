import { ExtendedPack, Item } from './types';

export const isPack = (item: Item): item is ExtendedPack =>
  (item as ExtendedPack).info.distributionType !== undefined;
