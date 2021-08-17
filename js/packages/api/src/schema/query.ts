import { queryType, stringArg, list, nonNull } from 'nexus';
import { Artwork } from './artwork';
import { Store, Creator } from './metaplex';

export const Query = queryType({
  definition(t) {
    t.field('storesCount', {
      type: 'Int',
      resolve: (_, args, { dataSources: { api } }) =>
        Object.keys(api.state.stores).length,
    });
    t.field('creatorsCount', {
      type: 'Int',
      resolve: (_, args, { dataSources: { api } }) =>
        Object.values(api.state.creators).length,
    });
    t.field('artworksCount', {
      type: 'Int',
      resolve: (_, args, { dataSources: { api } }) => api.state.metadata.length,
    });
    t.field('store', {
      type: Store,
      args: {
        storeId: nonNull(stringArg()),
      },
      resolve: (_, { storeId }, { dataSources: { api } }) =>
        api.getStore(storeId),
    });
    t.field('creators', {
      type: list(Creator),
      args: {
        storeId: nonNull(stringArg()),
      },
      resolve: (_, { storeId }, { dataSources: { api } }) =>
        api.getCreators(storeId),
    });
    t.field('creator', {
      type: Creator,
      args: { storeId: nonNull(stringArg()), creatorId: nonNull(stringArg()) },
      resolve: async (_, { storeId, creatorId }, { dataSources: { api } }) =>
        api.getCreator(storeId, creatorId),
    });
    t.field('artworks', {
      type: list(Artwork),
      args: { storeId: nonNull(stringArg()), creatorId: stringArg() },
      resolve: async (_, { storeId, creatorId }, { dataSources: { api } }) =>
        api.getArtworks(storeId, creatorId),
    });
  },
});
