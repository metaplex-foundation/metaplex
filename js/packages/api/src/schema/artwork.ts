import { enumType, objectType } from 'nexus';
import {
  artEditionNumber,
  artMaxSupply,
  artSupply,
  artType,
} from '../mappers/art';

export const ArtType = enumType({
  name: 'ArtType',
  members: {
    Master: 0,
    Print: 1,
    NFT: 2,
  },
});

export const Artwork = objectType({
  name: 'Artwork',
  definition(t) {
    t.string('uri', { resolve: item => item.data.uri });
    t.string('name', { resolve: item => item.data.name });
    t.pubkey('mint');
    t.list.field('creators', {
      type: ArtworkCreator,
      resolve: item => item.data.creators,
    });
    t.nonNull.int('sellerFeeBasisPoints', {
      resolve: item => item.data.sellerFeeBasisPoints || 0,
    });
    t.field('type', {
      type: ArtType,
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
    t.pubkey('address');
    t.boolean('verified');
    t.int('share');
  },
});
