import { Metadata } from '../../actions';
import { Store, WhitelistedCreator } from '../../models/metaplex';
import { ParsedAccount } from '../accounts/types';

export const isMetadataPartOfStore = (
  m: ParsedAccount<Metadata>,
  store: ParsedAccount<Store> | null,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
) => {
  if (!m?.info?.data?.creators || !store?.info) {
    return false;
  }

  return m.info.data.creators.some(
    c =>
      c.verified &&
      (store.info.public ||
        whitelistedCreatorsByCreator[c.address]?.info?.activated),
  );
};
