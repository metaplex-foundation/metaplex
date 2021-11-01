import { enumType, inputObjectType } from "nexus";

export const ArtworksInput = inputObjectType({
  name: "ArtworksInput",
  definition(t) {
    t.nonNull.string("storeId");
    t.string("creatorId");
    t.string("ownerId");
    t.string("artId");
    t.boolean("onlyVerified");
  },
});

export const AuctionInputState = enumType({
  name: "AuctionInputState",
  members: ["all", "live", "resale", "ended"],
});

export const AuctionsInput = inputObjectType({
  name: "AuctionsInput",
  definition(t) {
    t.string("storeId");
    t.string("participantId");
    t.field("state", { type: AuctionInputState });
  },
});
