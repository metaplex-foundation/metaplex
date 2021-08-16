import { WhitelistedCreator } from '@oyster/common/dist/lib/models';
import names from '../config/userNames.json';

export const extendCreatorName = (creator: WhitelistedCreator) => {
  const nameInfo = (names as any)[creator.address.toBase58()];

  return { ...creator, ...nameInfo };
};
