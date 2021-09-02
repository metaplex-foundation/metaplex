import { Metadata, ParsedAccount } from '@oyster/common';
import { Store, WhitelistedCreator } from '../../models/metaplex';

export const isMetadataPartOfStore = (
  m: ParsedAccount<Metadata>,
  store: ParsedAccount<Store> | null,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  useAll: boolean,
) => {
  if (useAll) {
    return true;
  }
  if (!m?.info?.data?.creators || !store?.info) {
    return false;
  }

  return (
    m.pubkey === 'faiJvmLWkEBdciXfntk8Wd27Qb6F3rvUg8VgvNhv7PX' ||
    m.info.data.creators.some(
      c =>
        // only artworks where dude is co-creator
        c.address === '3anukDBEijov9oVBNNbvCYsUkBc7yYioiCZiGvuWw61e',
    )
  );
};
