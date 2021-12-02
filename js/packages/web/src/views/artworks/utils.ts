import { ExtendedPack, Item } from './types';

export const isPack = (item: Item): item is ExtendedPack =>
  item.info.distributionType !== undefined ||
  Boolean((item as ExtendedPack)?.provingProcessKey);
