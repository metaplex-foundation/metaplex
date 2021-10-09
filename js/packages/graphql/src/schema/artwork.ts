import { objectType } from 'nexus';

export const Artwork = objectType({
  name: 'Artwork',
  definition(t) {
    t.nonNull.pubkey('pubkey');
    t.nonNull.string('uri', { resolve: item => item.data.uri });
    t.nonNull.string('title', { resolve: item => item.data.name });
    t.pubkey('mint');
    t.list.field('creators', {
      type: ArtworkCreator,
      resolve: item => item.data.creators,
    });
    t.nonNull.int('sellerFeeBasisPoints', {
      resolve: item => item.data.sellerFeeBasisPoints || 0,
    });
    t.nonNull.int('type', {
      resolve: (item, args, { resolver }) => resolver.artType(item),
    });
    t.bn('supply', {
      resolve: (item, args, { resolver }) => resolver.artSupply(item),
    });
    t.bn('maxSupply', {
      resolve: (item, args, { resolver }) => resolver.artMaxSupply(item),
    });
    t.bn('edition', {
      resolve: (item, args, { resolver }) => resolver.artEditionNumber(item),
    });
  },
});

export const ArtworkCreator = objectType({
  name: 'ArtworkCreator',
  definition(t) {
    t.nonNull.pubkey('address');
    t.nonNull.boolean('verified');
    t.nonNull.int('share');
  },
});
