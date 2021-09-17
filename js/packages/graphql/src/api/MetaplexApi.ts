import { isCreatorPartOfTheStore } from "../common";
import { NexusGenInputs } from "../generated/typings";
import { loadUserTokenAccounts } from "../utils/loadUserTokenAccounts";
import { filterByOwner, filterByStoreAndCreator } from "../artwork/filters";
import {
  filterByParticipant,
  filterByState,
  getAuctionById,
  getAuctionsByStoreId,
} from "../auction/filters";
import { mapInfo, wrapPubkey } from "../utils/mapInfo";
import { ConnectionConfig } from "./ConnectionConfig";
export class MetaplexApi {
  constructor(public readonly config: ConnectionConfig) {}

  loadUserAccounts(ownerId: string) {
    const { connection } = this.config;
    return loadUserTokenAccounts(connection, ownerId);
  }

  // meta methods

  subscribeIterator = this.config.subscribeIterator.bind(this.config);

  get state() {
    return this.config.load();
  }

  async getStore(storeId: string) {
    const { stores } = await this.state;
    const store = stores.get(storeId);
    return store ? wrapPubkey(store) : null;
  }

  async getCreators(storeId: string) {
    const [state, store] = await Promise.all([
      this.state,
      this.getStore(storeId),
    ]);
    const creators = state.creators.values();

    const creatorsByStore = [];
    if (!store) return [];

    for (const creator of creators) {
      const isWhitelistedCreator = await isCreatorPartOfTheStore(
        creator.info.address,
        creator.pubkey,
        storeId
      );
      if (isWhitelistedCreator) {
        creatorsByStore.push(creator);
      }
    }
    return mapInfo(creatorsByStore);
  }

  async getCreator(storeId: string, creatorId?: string | null) {
    const creators = await this.getCreators(storeId);
    return creators.find(({ address }) => address === creatorId) || null;
  }

  async getArtworks({
    storeId,
    creatorId,
    ownerId,
    onlyVerified,
  }: NexusGenInputs["ArtworksInput"]) {
    const { metadata } = await this.state;
    const [storeFilter, ownerFilter] = await Promise.all([
      filterByStoreAndCreator({ storeId, creatorId, onlyVerified }, this),
      filterByOwner({ ownerId }, this),
    ]);

    return mapInfo(metadata).filter(
      (art) => storeFilter(art) && ownerFilter(art)
    );
  }

  async getArtwork(artId: string) {
    const state = await this.state;
    const art = state.metadata.find(({ pubkey }) => pubkey === artId);
    return art ? wrapPubkey(art) : null;
  }

  async getAuctions({
    storeId,
    state,
    participantId,
  }: NexusGenInputs["AuctionsInput"]) {
    const baseState = await this.state;
    const stateFilter = filterByState({ state }, baseState);
    const participantFilter = filterByParticipant({ participantId }, baseState);

    return getAuctionsByStoreId(baseState, storeId).filter(
      (auction) => stateFilter(auction) && participantFilter(auction)
    );
  }

  async getAuction(auctionId: string) {
    const state = await this.state;
    return getAuctionById(state, auctionId);
  }
}
