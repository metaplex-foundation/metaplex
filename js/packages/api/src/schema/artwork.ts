import { enumType, objectType } from 'nexus';
import {
  artEditionNumber,
  artMaxSupply,
  artSupply,
  artType,
} from '../mappers/art';

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
      resolve: (item, args, { dataSources: { api } }) =>
        artType(item, api.state),
    });
    t.bn('supply', {
      resolve: (item, args, { dataSources: { api } }) =>
        artSupply(item, api.state),
    });
    t.bn('maxSupply', {
      resolve: (item, args, { dataSources: { api } }) =>
        artMaxSupply(item, api.state),
    });
    t.bn('edition', {
      resolve: (item, args, { dataSources: { api } }) =>
        artEditionNumber(item, api.state),
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
