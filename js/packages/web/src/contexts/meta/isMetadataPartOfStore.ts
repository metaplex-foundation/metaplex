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
  const badCreation = [
    /*Blacklist*/ 'Ci49ydpCtQZzgQtUcKK1PRZSAhupcCqUDrs5nyJ1mMMA' /*FuzzyTree*/,
    'D7izzRxvWdTVyQfWet72UAnhAXxXMidsxjC1zdB1kKBn' /*DeadTree*/,
    'J6qyygerZByZC6sYvcXnCa6YSdt29kNfskiT27VJtHtf' /*BlackIBM*/,
    'DvN7VbZ8wx8oH8AvQcxzE7rwvtkB3ukPuYpZhAN8iMW2' /*DeadIBM*/,
    'FwrCerpoFHwLbZHESrEDsA9fo3t93qKphdGZQn8SCteH' /*NoColorWand*/,
    'SNu7JDgeyfRPUuYPVB2AZiZkaHdGQ4DiB2zbyLEfZPt' /*DeziKrember*/,
    'Focw2ZLMERi3bZr2wyYPXCMsSTkLgekzb67ijNvAUDSJ' /*ShortFizzlySword*/,
    '3VPaKo4gPC7ore5DQ8c1PaS64PGBU2jUzpSgM3guD7XK' /*HammerPrint*/,
    '6DmLQerLV2bFnYf5K4SY1yTX3oATT1P37qUFcMM7qUg6' /*HammerNoHalo*/,
    'jshCZVP9txREhyYFcxbwP5EaKaPjBNM8bhZ7AhywMcb' /*BreathRingNoHalo*/,
    '4NA5uzsLMdNxUYqwe73W1K4Zh8MNCBGtS4cwAJsT8wfR' /*BreathRingAffect*/,
    '6iPCcMkaw9g9d9gbBQvHQP4NXVWcL4ew4wvSrwypgpj6' /*AmuletNoHalo*/,
    'CV9vEXffVPQQomLtbHEqS7hqV4n7qstb4FJpics5p389' /*NamedAxedNotHammer*/,
    '7bwx4P9pJMa6T2oSs8RLZCs2rYHdCk12GoG9KkERqidn' /*666Battleaxe*/,
  ];
  if (badCreation.includes(m.pubkey.toBase58())) {
    return false;
  }
  if (useAll) {
    return true;
  }
  if (!m?.info?.data?.creators || !store?.info) {
    return false;
  }

  return m.info.data.creators.some(
    c =>
      c.verified &&
      (store.info.public ||
        whitelistedCreatorsByCreator[c.address.toBase58()]?.info?.activated),
  );
};
