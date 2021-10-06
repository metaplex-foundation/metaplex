import {
  getAuctionBids,
  MetaState,
  ParsedAccount,
  getEmptyState,
  getSafetyDepositBoxes,
} from "../../common";
import { NexusGenInputs } from "../../generated/typings";
import { loadUserTokenAccounts } from "../../utils/loadUserTokenAccounts";
import { listWrapPubkey, wrapPubkey } from "../../utils/mapInfo";
import { FilterFn, IEvent, StateProvider } from "../StateProvider";
import { Auction, AuctionManager } from "../../types/sourceTypes";
import { IMetaplexApi, TPropNames } from "../IMetaplexApi";
import { filterByParticipant } from "./filterByParticipant";
import { filterByState } from "./filterByState";
import { getAuctionsByStoreId } from "./getAuctionsByStoreId";
import { getAuctionById } from "./getAuctionById";
import {
  getAuctionMetadata,
  getParticipationConfig,
} from "./getAuctionMetadata";
import { filterByStoreAndCreator } from "./filterByStoreAndCreator";
import { filterByOwner } from "./filterByOwner";

export class MemoryApi implements IMetaplexApi {
  static buildFromProvider(provider: StateProvider) {
    return new this(provider);
  }

  static build(
    name: string,
    endpoint: string,
    flowControl?: {
      promise: Promise<void>;
      finish: () => void;
    }
  ) {
    let ptr: MemoryApi | undefined;
    new StateProvider(
      name,
      endpoint,
      (provider) => {
        ptr = this.buildFromProvider(provider);
        return ptr;
      },
      flowControl
    );
    return ptr!;
  }

  private constructor(public readonly provider: StateProvider) {}

  public get network() {
    return this.provider.name;
  }

  public get connection() {
    return this.provider.connection;
  }

  public flush() {
    return Promise.resolve();
  }

  public subscribeIterator(
    prop: keyof MetaState,
    key?: string | FilterFn<IEvent> | undefined
  ) {
    return this.provider.subscribeIterator(prop, key);
  }

  loadUserAccounts(ownerId: string) {
    const { connection } = this.provider;
    return loadUserTokenAccounts(connection, ownerId);
  }

  // meta methods

  private internalState: MetaState = getEmptyState();

  private persistToState(
    state: MetaState,
    prop: TPropNames,
    key: string,
    value: ParsedAccount<any>
  ) {
    if (prop === "metadata") {
      // TODO: implement replacement strate
      state[prop].push(value);
    } else {
      state[prop].set(key, value);
    }
  }

  persist(
    prop: TPropNames,
    key: string,
    value: ParsedAccount<any>
  ): Promise<void> {
    this.persistToState(this.internalState, prop, key, value);
    return Promise.resolve();
  }

  persistBatch(
    clazz: any,
    values: ParsedAccount<any>[],
    prop: TPropNames
  ): Promise<void> {
    values.forEach((value) =>
      this.persistToState(this.internalState, prop, value.pubkey, value)
    );
    return Promise.resolve();
  }

  private get state() {
    return this.provider.load().then(() => this.internalState);
  }

  public storesCount() {
    return this.state.then(({ stores }) => stores.size);
  }

  public creatorsCount() {
    return this.state.then(({ creators }) => creators.size);
  }

  public artworksCount() {
    return this.state.then(({ metadata }) => metadata.length);
  }

  public auctionsCount() {
    return this.state.then(({ auctions }) => auctions.size);
  }

  public async preload() {
    await this.state;
  }

  public async getStores() {
    const { stores } = await this.state;
    return listWrapPubkey(stores);
  }

  public async getStore(storeId: string) {
    const { stores } = await this.state;
    const store = stores.get(storeId);
    return store ? wrapPubkey(store) : null;
  }

  public async getCreators(storeId: string) {
    const [{ creators }, store] = await Promise.all([
      this.state,
      this.getStore(storeId),
    ]);

    const creatorsByStore = [];
    if (!store) return [];

    for (const creator of creators.values()) {
      const isWhitelistedCreator = await creator.info.isCreatorPartOfTheStore(
        storeId
      );
      if (isWhitelistedCreator) {
        creatorsByStore.push(creator);
      }
    }
    return listWrapPubkey(creatorsByStore);
  }

  public async getCreator(storeId: string, creatorId?: string | null) {
    const creators = await this.getCreators(storeId);
    return creators.find(({ address }) => address === creatorId) || null;
  }

  public async getArtworks({
    storeId,
    creatorId,
    ownerId,
    onlyVerified,
  }: NexusGenInputs["ArtworksInput"]) {
    const { metadata } = await this.state;
    const storeCreators = await this.getCreators(storeId);
    const [storeFilter, ownerFilter] = await Promise.all([
      filterByStoreAndCreator(
        { storeId, creatorId, onlyVerified },
        storeCreators
      ),
      filterByOwner({ ownerId }, this),
    ]);

    return listWrapPubkey(metadata).filter(
      (art) => storeFilter(art) && ownerFilter(art)
    );
  }

  public async getArtwork(artId: string) {
    const state = await this.state;
    const art = state.metadata.find(({ pubkey }) => pubkey === artId);
    return art ? wrapPubkey(art) : null;
  }

  public async getAuctions({
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

  public async getAuction(auctionId: string) {
    const state = await this.state;
    return getAuctionById(state, auctionId);
  }

  // artwork

  public async getEdition(id?: string) {
    const state = await this.state;
    return (id ? state.editions.get(id)?.info : null) ?? null;
  }

  public async getMasterEdition(id?: string) {
    const state = await this.state;
    return (id ? state.masterEditions.get(id)?.info : null) ?? null;
  }

  // auction

  public async getAuctionThumbnail(auction: Auction) {
    const state = await this.state;
    const metadataList = await getAuctionMetadata(auction, state);
    const metadata = metadataList[0];
    return metadata ? wrapPubkey(metadata) : null;
  }

  public async getAuctionHighestBid(auction: Auction) {
    const state = await this.state;
    const bids = getAuctionBids(
      Array.from(state.bidderMetadataByAuctionAndBidder.values()),
      auction.pubkey
    );
    const highestBid = bids?.[0];
    return highestBid ? wrapPubkey(highestBid) : null;
  }

  public async getAuctionBids(auction: Auction) {
    const state = await this.state;
    const bids = getAuctionBids(
      Array.from(state.bidderMetadataByAuctionAndBidder.values()),
      auction.pubkey
    );
    return listWrapPubkey(bids);
  }

  public async getVault(id?: string) {
    const state = await this.state;
    return (id ? state.vaults.get(id)?.info : null) ?? null;
  }

  public async getSafetyDepositBoxes(manager: AuctionManager) {
    const state = await this.state;
    const boxes = getSafetyDepositBoxes(
      manager.vault,
      state.safetyDepositBoxesByVaultAndIndex
    );
    return listWrapPubkey(boxes);
  }

  public async getParticipationConfig(manager: AuctionManager) {
    const state = await this.state;
    return getParticipationConfig(manager, state);
  }
}
