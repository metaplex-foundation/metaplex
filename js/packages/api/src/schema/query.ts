import { queryType, stringArg, list, nonNull } from 'nexus';
import { Artwork } from './artwork';
import { Auction } from './auction';
import { ArtworksInput, AuctionsInput } from './inputs';
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
    t.field('auctionsCount', {
      type: 'Int',
      resolve: (_, args, { dataSources: { api } }) =>
        Object.values(api.state.auctions).length,
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
      args: { filter: nonNull(ArtworksInput.asArg()) },
      resolve: async (_, { filter }, { dataSources: { api } }) =>
        api.getArtworks(filter),
    });
    t.field('artwork', {
      type: Artwork,
      args: { artId: nonNull(stringArg()) },
      resolve: async (_, { artId }, { dataSources: { api } }) =>
        api.getArtwork(artId),
    });
    t.field('auctions', {
      type: list(Auction),
      args: { filter: nonNull(AuctionsInput.asArg()) },
      resolve: async (_, { filter }, { dataSources: { api } }) =>
        api.getAuctions(filter),
    });
    t.field('auction', {
      type: Auction,
      args: { auctionId: nonNull(stringArg()) },
      resolve: async (_, { auctionId }, { dataSources: { api } }) =>
        api.getAuction(auctionId),
    });
  },
});
