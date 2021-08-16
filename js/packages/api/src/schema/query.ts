import { queryType, stringArg, list, nonNull } from 'nexus';
import { Metadata } from './metadata';
import { Store, WhitelistedCreator } from './metaplex';

export const Query = queryType({
  definition(t) {
    t.field('storesCount', {
      type: 'Int',
      resolve: (_, args, { dataSources }) =>
        Object.keys(dataSources.dataApi.state.stores).length,
    });
    t.field('creatorsCount', {
      type: 'Int',
      resolve: (_, args, { dataSources }) =>
        Object.values(dataSources.dataApi.state.creators).length,
    });
    t.field('artworksCount', {
      type: 'Int',
      resolve: (_, args, { dataSources }) =>
        dataSources.dataApi.state.metadata.length,
    });
    t.field('store', {
      type: Store,
      args: {
        storeId: nonNull(stringArg()),
      },
      resolve: (_, { storeId }, { dataSources }) =>
        dataSources.dataApi.getStore(storeId),
    });
    t.field('creators', {
      type: list(WhitelistedCreator),
      args: {
        storeId: nonNull(stringArg()),
      },
      resolve(_, { storeId }, { dataSources }) {
        return dataSources.dataApi.getCreators(storeId);
      },
    });
    t.field('creator', {
      type: WhitelistedCreator,
      args: { storeId: nonNull(stringArg()), creatorId: nonNull(stringArg()) },
      async resolve(_, { storeId, creatorId }, { dataSources }) {
        return dataSources.dataApi.getCreator(storeId, creatorId);
      },
    });
    t.field('artworks', {
      type: list(Metadata),
      args: { storeId: nonNull(stringArg()), creatorId: stringArg() },
      async resolve(_, { storeId, creatorId }, { dataSources }) {
        return dataSources.dataApi.getArtworks(storeId, creatorId);
      },
    });
  },
});
