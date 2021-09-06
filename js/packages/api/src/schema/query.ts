import { queryType, stringArg, list, nonNull } from 'nexus';
import { Store, WhitelistedCreator } from './metaplex';

export const Query = queryType({
  definition(t) {
    t.string('hello', {
      args: { name: stringArg() },
      resolve: (parent, { name }) => `Hello ${name || 'World'}!`,
    });
    t.field('storesCount', {
      type: 'Int',
      resolve: (_, args, { dataSources }) =>
        Object.keys(dataSources.dataApi.state.stores).length,
    });
    t.field('stores', {
      type: list(Store),
      resolve: (_, args, { dataSources }) =>
        Object.values(dataSources.dataApi.state.stores).map(({ info }) => info),
    });
    t.field('store', {
      type: Store,
      args: {
        id: nonNull(
          stringArg({
            description: 'Store ID, processed from Store Owner Address',
          }),
        ),
      },
      resolve: (_, { id }, { dataSources }) =>
        dataSources.dataApi.state.stores[id].info,
    });
    t.field('creatorsCount', {
      type: 'Int',
      resolve(_, args, { dataSources }) {
        return Object.values(dataSources.dataApi.state.creators).length;
      },
    });
    t.field('creators', {
      type: list(WhitelistedCreator),
      args: {
        id: stringArg(),
      },
      resolve(_, { id }, { dataSources }) {
        return dataSources.dataApi.getCreators(id);
      },
    });
    t.field('creatorsByStore', {
      type: list(WhitelistedCreator),
      args: {
        storeId: nonNull(stringArg()),
      },
      async resolve(_, { storeId }, { dataSources }) {
        return dataSources.dataApi.getCreatorsByStore(storeId);
      },
    });
    t.field('creatorByStore', {
      type: WhitelistedCreator,
      args: { storeId: nonNull(stringArg()), creatorId: nonNull(stringArg()) },
      async resolve(_, { storeId, creatorId }, { dataSources }) {
        return dataSources.dataApi.getCreatorByStore(storeId, creatorId);
      },
    });
  },
});
