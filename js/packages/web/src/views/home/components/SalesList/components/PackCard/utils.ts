import { ParsedAccount, WhitelistedCreator } from '@oyster/common';
import { Artist } from '../../../../../../types';

export const getCreator = (
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  authority: string,
): Artist => {
  const knownCreator = whitelistedCreatorsByCreator[authority];

  return {
    address: authority,
    verified: true,
    image: knownCreator?.info.image || '',
    name: knownCreator?.info.name || '',
    link: knownCreator?.info.twitter || '',
  } as Artist;
};
