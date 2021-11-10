export const getTotalNFTsCount = (
  distributions: Record<string, number>,
): number =>
  Object.values(distributions).reduce((itemSupply, sum) => sum + itemSupply, 0);
