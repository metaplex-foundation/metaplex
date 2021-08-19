import { inputObjectType } from 'nexus';

export const ArtworksInput = inputObjectType({
  name: 'ArtworksInput',
  definition(t) {
    t.nonNull.string('storeId');
    t.string('creatorId');
    t.string('ownerId');
    t.string('artId');
    t.boolean('onlyVerified');
  },
});
