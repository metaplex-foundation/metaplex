import { ExtendedPackWithMetadata, Item } from './types';

export const isPack = (item: Item): item is ExtendedPackWithMetadata =>
  (item as ExtendedPackWithMetadata).info.distributionType !== undefined;
