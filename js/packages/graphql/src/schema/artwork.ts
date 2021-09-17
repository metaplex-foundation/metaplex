import { objectType } from "nexus";
import {
  artEditionNumber,
  artMaxSupply,
  artSupply,
  artType,
} from "../artwork/mappers";

export const Artwork = objectType({
  name: "Artwork",
  definition(t) {
    t.nonNull.pubkey("pubkey");
    t.nonNull.string("uri", { resolve: (item) => item.data.uri });
    t.nonNull.string("title", { resolve: (item) => item.data.name });
    t.pubkey("mint");
    t.list.field("creators", {
      type: ArtworkCreator,
      resolve: (item) => item.data.creators,
    });
    t.nonNull.int("sellerFeeBasisPoints", {
      resolve: (item) => item.data.sellerFeeBasisPoints || 0,
    });
    t.nonNull.int("type", {
      resolve: (item, args, { api }) =>
        api.state.then((state) => artType(item, state)),
    });
    t.bn("supply", {
      resolve: (item, args, { api }) =>
        api.state.then((state) => artSupply(item, state)),
    });
    t.bn("maxSupply", {
      resolve: (item, args, { api }) =>
        api.state.then((state) => artMaxSupply(item, state)),
    });
    t.bn("edition", {
      resolve: (item, args, { api }) =>
        api.state.then((state) => artEditionNumber(item, state)),
    });
  },
});

export const ArtworkCreator = objectType({
  name: "ArtworkCreator",
  definition(t) {
    t.nonNull.pubkey("address");
    t.nonNull.boolean("verified");
    t.nonNull.int("share");
  },
});
