import { objectType } from 'nexus';

export const Store = objectType({
  name: 'Store',
  definition(t) {
    t.nonNull.pubkey('pubkey');
    t.nonNull.int('key');
    t.nonNull.boolean('public');
    t.nonNull.pubkey('auctionProgram');
    t.nonNull.pubkey('tokenVaultProgram');
    t.nonNull.pubkey('tokenMetadataProgram');
    t.nonNull.pubkey('tokenProgram');
  },
});

export const Creator = objectType({
  name: 'Creator',
  definition(t) {
    t.nonNull.pubkey('pubkey');
    t.nonNull.int('key');
    t.nonNull.pubkey('address');
    t.nonNull.boolean('activated');
  },
});
