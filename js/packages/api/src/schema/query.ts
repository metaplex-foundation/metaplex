import { queryType, stringArg, list, nonNull } from 'nexus';
import { AccountWithStore, AccountWithWhitelistedCreator } from './account';
import { isCreatorPartOfTheStore } from '@oyster/common/dist/lib/models/metaplex/index';
import { PublicKey } from '@solana/web3.js';

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
      type: list(AccountWithStore),
      resolve: (_, args, { dataSources }) =>
        Object.values(dataSources.dataApi.state.stores),
    });
    t.field('store', {
      type: AccountWithStore,
      args: {
        id: nonNull(
          stringArg({
            description: 'Store ID, processed from Store Owner Address',
          }),
        ),
      },
      resolve: (_, { id }, { dataSources }) =>
        dataSources.dataApi.state.stores[id],
    });
    t.field('creatorsCount', {
      type: 'Int',
      resolve(_, args, { dataSources }) {
        return Object.values(dataSources.dataApi.state.creators).length;
      },
    });
    t.field('creators', {
      type: list(AccountWithWhitelistedCreator),
      args: {
        id: stringArg(),
      },
      resolve(_, { id }, { dataSources }) {
        const { creators } = dataSources.dataApi.state;
        if (id) {
          const filtered = Object.entries(creators).filter(([key]) =>
            key.startsWith(`${id}-`),
          );
          return filtered.map(([_, item]) => item);
        }
        return Object.values(creators);
      },
    });
    t.field('creatorsByStore', {
      type: list(AccountWithWhitelistedCreator),
      args: {
        storeId: nonNull(stringArg()),
      },
      async resolve(_, { storeId }, { dataSources }) {
        return dataSources.dataApi.getCreatorsByStore(storeId);
      },
    });
  },
});
