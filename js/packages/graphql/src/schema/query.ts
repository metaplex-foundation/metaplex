import { queryType, stringArg, list, nonNull } from "nexus";
import { Artwork } from "./artwork";
import { Auction } from "./auction";
import { ArtworksInput, AuctionsInput } from "./inputs";
import { Store, Creator } from "./metaplex";

export const Query = queryType({
  definition(t) {
    t.field("storesCount", {
      type: "Int",
      resolve: (_, args, { api }) => api.storesCount(),
    });
    t.field("creatorsCount", {
      type: "Int",
      resolve: (_, args, { api }) => api.creatorsCount(),
    });
    t.field("artworksCount", {
      type: "Int",
      resolve: (_, args, { api }) => api.artworksCount(),
    });
    t.field("auctionsCount", {
      type: "Int",
      resolve: (_, args, { api }) => api.auctionsCount(),
    });
    t.field("stores", {
      type: list(nonNull(Store)),
      resolve: (_, args, { api }) => api.getStores(),
    });
    //   t.field("store", {
    //     type: Store,
    //     args: {
    //       storeId: nonNull(stringArg()),
    //     },
    //     resolve: (_, { storeId }, { api }) => api.getStore(storeId),
    //   });
    //   t.field("creators", {
    //     type: list(nonNull(Creator)),
    //     args: {
    //       storeId: nonNull(stringArg()),
    //     },
    //     resolve: (_, { storeId }, { api }) => api.getCreators(storeId),
    //   });
    //   t.field("creator", {
    //     type: Creator,
    //     args: { storeId: nonNull(stringArg()), creatorId: nonNull(stringArg()) },
    //     resolve: async (_, { storeId, creatorId }, { api }) =>
    //       api.getCreator(storeId, creatorId),
    //   });
    //   t.field("artworks", {
    //     type: list(nonNull(Artwork)),
    //     args: { filter: nonNull(ArtworksInput.asArg()) },
    //     resolve: async (_, { filter }, { api }) => api.getArtworks(filter),
    //   });
    //   t.field("artwork", {
    //     type: Artwork,
    //     args: { storeId: stringArg(), artId: nonNull(stringArg()) },
    //     resolve: async (_, { artId }, { api }) => api.getArtwork(artId),
    //   });
    //   t.field("auctions", {
    //     type: list(nonNull(Auction)),
    //     args: { filter: nonNull(AuctionsInput.asArg()) },
    //     resolve: async (_, { filter }, { api }) => api.getAuctions(filter),
    //   });
    //   t.field("auction", {
    //     type: Auction,
    //     args: { storeId: stringArg(), auctionId: nonNull(stringArg()) },
    //     resolve: async (_, { auctionId }, { api }) => api.getAuction(auctionId),
    //   });
  },
});
