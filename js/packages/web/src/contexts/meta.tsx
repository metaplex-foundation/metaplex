import {
  programIds,
  useConnection,
  decodeMetadata,
  AuctionParser,
  decodeEdition,
  decodeMasterEdition,
  Metadata,
  getMultipleAccounts,
  cache,
  MintParser,
  ParsedAccount,
  actions,
  Edition,
  MasterEdition,
  AuctionData,
  SafetyDepositBox,
  VaultKey,
  decodeSafetyDeposit,
  BidderMetadata,
  BidderMetadataParser,
  BidderPot,
  BidderPotParser,
  BIDDER_METADATA_LEN,
  BIDDER_POT_LEN,
  decodeVault,
  Vault,
  setProgramIds,
  useConnectionConfig,
} from '@oyster/common';
import { MintInfo } from '@solana/spl-token';
import { Connection, PublicKey, PublicKeyAndAccount } from '@solana/web3.js';
import BN from 'bn.js';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuctionManager,
  AuctionManagerStatus,
  BidRedemptionTicket,
  decodeAuctionManager,
  decodeBidRedemptionTicket,
  decodeStore,
  decodeWhitelistedCreator,
  getWhitelistedCreator,
  MetaplexKey,
  Store,
  WhitelistedCreator,
  WhitelistedCreatorParser,
  PayoutTicket,
  decodePayoutTicket,
} from '../models/metaplex';
import names from './../config/userNames.json';

const { MetadataKey } = actions;
export interface MetaContextState {
  metadata: ParsedAccount<Metadata>[];
  unfilteredMetadata: ParsedAccount<Metadata>[];
  metadataByMint: Record<string, ParsedAccount<Metadata>>;
  metadataByMasterEdition: Record<string, ParsedAccount<Metadata>>;
  editions: Record<string, ParsedAccount<Edition>>;
  masterEditions: Record<string, ParsedAccount<MasterEdition>>;
  masterEditionsByPrintingMint: Record<string, ParsedAccount<MasterEdition>>;
  masterEditionsByOneTimeAuthMint: Record<string, ParsedAccount<MasterEdition>>;
  auctionManagersByAuction: Record<string, ParsedAccount<AuctionManager>>;
  auctions: Record<string, ParsedAccount<AuctionData>>;
  isLoading: boolean;
  vaults: Record<string, ParsedAccount<Vault>>;
  store: ParsedAccount<Store> | null;
  bidderMetadataByAuctionAndBidder: Record<
    string,
    ParsedAccount<BidderMetadata>
  >;
  safetyDepositBoxesByVaultAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositBox>
  >;
  bidderPotsByAuctionAndBidder: Record<string, ParsedAccount<BidderPot>>;
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>;
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >;
  payoutTickets: Record<string, ParsedAccount<PayoutTicket>>;
}

const MetaContext = React.createContext<MetaContextState>({
  metadata: [],
  unfilteredMetadata: [],
  metadataByMint: {},
  masterEditions: {},
  masterEditionsByPrintingMint: {},
  masterEditionsByOneTimeAuthMint: {},
  metadataByMasterEdition: {},
  editions: {},
  auctionManagersByAuction: {},
  auctions: {},
  vaults: {},
  store: null,
  isLoading: false,
  bidderMetadataByAuctionAndBidder: {},
  safetyDepositBoxesByVaultAndIndex: {},
  bidderPotsByAuctionAndBidder: {},
  bidRedemptions: {},
  whitelistedCreatorsByCreator: {},
  payoutTickets: {},
});

export function MetaProvider({ children = null as any }) {
  const connection = useConnection();
  const { env } = useConnectionConfig();

  const [metadata, setMetadata] = useState<ParsedAccount<Metadata>[]>([]);
  const [metadataByMint, setMetadataByMint] = useState<
    Record<string, ParsedAccount<Metadata>>
  >({});
  const [masterEditions, setMasterEditions] = useState<
    Record<string, ParsedAccount<MasterEdition>>
  >({});

  const [masterEditionsByPrintingMint, setmasterEditionsByPrintingMint] =
    useState<Record<string, ParsedAccount<MasterEdition>>>({});

  const [masterEditionsByOneTimeAuthMint, setMasterEditionsByOneTimeAuthMint] =
    useState<Record<string, ParsedAccount<MasterEdition>>>({});

  const [metadataByMasterEdition, setMetadataByMasterEdition] = useState<
    Record<string, ParsedAccount<Metadata>>
  >({});

  const [editions, setEditions] = useState<
    Record<string, ParsedAccount<Edition>>
  >({});
  const [auctionManagersByAuction, setAuctionManagersByAuction] = useState<
    Record<string, ParsedAccount<AuctionManager>>
  >({});

  const [bidRedemptions, setBidRedemptions] = useState<
    Record<string, ParsedAccount<BidRedemptionTicket>>
  >({});
  const [auctions, setAuctions] = useState<
    Record<string, ParsedAccount<AuctionData>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [vaults, setVaults] = useState<Record<string, ParsedAccount<Vault>>>(
    {},
  );
  const [payoutTickets, setPayoutTickets] = useState<
    Record<string, ParsedAccount<PayoutTicket>>
  >({});
  const [store, setStore] = useState<ParsedAccount<Store> | null>(null);
  const [whitelistedCreatorsByCreator, setWhitelistedCreatorsByCreator] =
    useState<Record<string, ParsedAccount<WhitelistedCreator>>>({});

  const [
    bidderMetadataByAuctionAndBidder,
    setBidderMetadataByAuctionAndBidder,
  ] = useState<Record<string, ParsedAccount<BidderMetadata>>>({});
  const [bidderPotsByAuctionAndBidder, setBidderPotsByAuctionAndBidder] =
    useState<Record<string, ParsedAccount<BidderPot>>>({});
  const [
    safetyDepositBoxesByVaultAndIndex,
    setSafetyDepositBoxesByVaultAndIndex,
  ] = useState<Record<string, ParsedAccount<SafetyDepositBox>>>({});

  const updateMints = useCallback(
    async metadataByMint => {
      try {
        const m = await queryExtendedMetadata(connection, metadataByMint);
        setMetadata(m.metadata);
        setMetadataByMint(m.mintToMetadata);
      } catch (er) {
        console.error(er);
      }
    },
    [setMetadata, setMetadataByMint],
  );

  useEffect(() => {
    let dispose = () => {};
    (async () => {
      const accounts = (
        await Promise.all([
          connection.getProgramAccounts(programIds().vault),
          connection.getProgramAccounts(programIds().auction),
          connection.getProgramAccounts(programIds().metadata),
          connection.getProgramAccounts(programIds().metaplex),
        ])
      ).flat();

      await setProgramIds(env);

      const tempCache = {
        metadata: {},
        metadataByMint: {},
        masterEditions: {},
        masterEditionsByPrintingMint: {},
        masterEditionsByOneTimeAuthMint: {},
        metadataByMasterEdition: {},
        editions: {},
        auctionManagersByAuction: {},
        bidRedemptions: {},
        auctions: {},
        vaults: {},
        payoutTickets: {},
        store: {},
        whitelistedCreatorsByCreator: {},
        bidderMetadataByAuctionAndBidder: {},
        bidderPotsByAuctionAndBidder: {},
        safetyDepositBoxesByVaultAndIndex: {},
      };

      for (let i = 0; i < accounts.length; i++) {
        processVaultData(
          accounts[i],
          (cb: any) =>
            (tempCache.safetyDepositBoxesByVaultAndIndex = cb(
              tempCache.safetyDepositBoxesByVaultAndIndex,
            )),
          (cb: any) => (tempCache.vaults = cb(tempCache.vaults)),
        );

        processAuctions(
          accounts[i],
          (cb: any) => (tempCache.auctions = cb(tempCache.auctions)),
          (cb: any) =>
            (tempCache.bidderMetadataByAuctionAndBidder = cb(
              tempCache.bidderMetadataByAuctionAndBidder,
            )),
          (cb: any) =>
            (tempCache.bidderPotsByAuctionAndBidder = cb(
              tempCache.bidderPotsByAuctionAndBidder,
            )),
        );

        await processMetaData(
          accounts[i],
          (cb: any) =>
            (tempCache.metadataByMint = cb(tempCache.metadataByMint)),
          (cb: any) =>
            (tempCache.metadataByMasterEdition = cb(
              tempCache.metadataByMasterEdition,
            )),
          (cb: any) => (tempCache.editions = cb(tempCache.editions)),
          (cb: any) =>
            (tempCache.masterEditions = cb(tempCache.masterEditions)),
          (cb: any) =>
            (tempCache.masterEditionsByPrintingMint = cb(
              tempCache.masterEditionsByPrintingMint,
            )),
          (cb: any) =>
            (tempCache.masterEditionsByOneTimeAuthMint = cb(
              tempCache.masterEditionsByOneTimeAuthMint,
            )),
        );

        await processMetaplexAccounts(
          accounts[i],
          (cb: any) =>
            (tempCache.auctionManagersByAuction = cb(
              tempCache.auctionManagersByAuction,
            )),
          (cb: any) =>
            (tempCache.bidRedemptions = cb(tempCache.bidRedemptions)),
          (cb: any) => (tempCache.payoutTickets = cb(tempCache.payoutTickets)),
          (obj: any) => (tempCache.store = obj),
          (cb: any) =>
            (tempCache.whitelistedCreatorsByCreator = cb(
              tempCache.whitelistedCreatorsByCreator,
            )),
        );
      }

      setSafetyDepositBoxesByVaultAndIndex(
        tempCache.safetyDepositBoxesByVaultAndIndex,
      );
      setVaults(tempCache.vaults);
      setAuctions(tempCache.auctions);
      setBidderMetadataByAuctionAndBidder(
        tempCache.bidderMetadataByAuctionAndBidder,
      );
      setBidderPotsByAuctionAndBidder(tempCache.bidderPotsByAuctionAndBidder);
      setMetadataByMint(tempCache.metadataByMint);
      setMetadataByMasterEdition(tempCache.metadataByMasterEdition);
      setEditions(tempCache.editions);
      setMasterEditions(tempCache.masterEditions);
      setmasterEditionsByPrintingMint(tempCache.masterEditionsByPrintingMint);
      setMasterEditionsByOneTimeAuthMint(
        tempCache.masterEditionsByOneTimeAuthMint,
      );
      setAuctionManagersByAuction(tempCache.auctionManagersByAuction);
      setBidRedemptions(tempCache.bidRedemptions);
      setPayoutTickets(tempCache.payoutTickets);
      setStore(tempCache.store as any);
      setWhitelistedCreatorsByCreator(tempCache.whitelistedCreatorsByCreator);
      setIsLoading(false);

      updateMints(tempCache.metadataByMint);
    })();

    return () => {
      dispose();
    };
  }, [
    connection,
    setSafetyDepositBoxesByVaultAndIndex,
    setVaults,
    setAuctions,
    setBidderMetadataByAuctionAndBidder,
    setBidderPotsByAuctionAndBidder,
    setMetadataByMint,
    setMetadataByMasterEdition,
    setEditions,
    setMasterEditions,
    setmasterEditionsByPrintingMint,
    setMasterEditionsByOneTimeAuthMint,
    setAuctionManagersByAuction,
    setBidRedemptions,
    setPayoutTickets,
    setStore,
    setWhitelistedCreatorsByCreator,
    updateMints,
    env,
  ]);

  useEffect(() => {
    let vaultSubId = connection.onProgramAccountChange(
      programIds().vault,
      async info => {
        const pubkey =
          typeof info.accountId === 'string'
            ? new PublicKey(info.accountId as unknown as string)
            : info.accountId;
        await processVaultData(
          {
            pubkey,
            account: info.accountInfo,
          },
          setSafetyDepositBoxesByVaultAndIndex,
          setVaults,
        );
      },
    );

    let metaplexSubId = connection.onProgramAccountChange(
      programIds().metaplex,
      async info => {
        const pubkey =
          typeof info.accountId === 'string'
            ? new PublicKey(info.accountId as unknown as string)
            : info.accountId;
        await processMetaplexAccounts(
          {
            pubkey,
            account: info.accountInfo,
          },
          setAuctionManagersByAuction,
          setBidRedemptions,
          setPayoutTickets,
          setStore,
          setWhitelistedCreatorsByCreator,
        );
      },
    );

    let metaSubId = connection.onProgramAccountChange(
      programIds().metadata,
      async info => {
        const pubkey =
          typeof info.accountId === 'string'
            ? new PublicKey(info.accountId as unknown as string)
            : info.accountId;
        await processMetaData(
          {
            pubkey,
            account: info.accountInfo,
          },
          setMetadataByMint,
          setMetadataByMasterEdition,
          setEditions,
          setMasterEditions,
          setmasterEditionsByPrintingMint,
          setMasterEditionsByOneTimeAuthMint,
        );

        setMetadataByMint(latest => {
          updateMints(latest);
          return latest;
        });
      },
    );

    let auctionSubId = connection.onProgramAccountChange(
      programIds().auction,
      async info => {
        const pubkey =
          typeof info.accountId === 'string'
            ? new PublicKey(info.accountId as unknown as string)
            : info.accountId;
        await processAuctions(
          {
            pubkey,
            account: info.accountInfo,
          },
          setAuctions,
          setBidderMetadataByAuctionAndBidder,
          setBidderPotsByAuctionAndBidder,
        );
      },
    );

    return () => {
      connection.removeProgramAccountChangeListener(vaultSubId);
      connection.removeProgramAccountChangeListener(metaplexSubId);
      connection.removeProgramAccountChangeListener(metaSubId);
      connection.removeProgramAccountChangeListener(auctionSubId);
    };
  }, [
    connection,
    setSafetyDepositBoxesByVaultAndIndex,
    setVaults,
    setAuctions,
    setBidderMetadataByAuctionAndBidder,
    setBidderPotsByAuctionAndBidder,
    setMetadataByMint,
    setMetadataByMasterEdition,
    setEditions,
    setMasterEditions,
    setmasterEditionsByPrintingMint,
    setMasterEditionsByOneTimeAuthMint,
    setAuctionManagersByAuction,
    setBidRedemptions,
    setPayoutTickets,
    setStore,
    setWhitelistedCreatorsByCreator,
    updateMints,
  ]);

  const filteredMetadata = useMemo(
    () =>
      metadata.filter(m =>
        m?.info?.data?.creators?.find(
          c =>
            c.verified &&
            store &&
            store.info &&
            (store.info.public ||
              whitelistedCreatorsByCreator[c.address.toBase58()]?.info
                ?.activated),
        ),
      ),
    [metadata, store, whitelistedCreatorsByCreator],
  );

  useEffect(() => {
    // TODO: fetch names dynamically
  });

  // TODO: get names for creators
  // useEffect(() => {
  //   (async () => {
  //     const twitterHandles = await connection.getProgramAccounts(NAME_PROGRAM_ID, {
  //      filters: [
  //        {
  //           dataSize: TWITTER_ACCOUNT_LENGTH,
  //        },
  //        {
  //          memcmp: {
  //           offset: VERIFICATION_AUTHORITY_OFFSET,
  //           bytes: TWITTER_VERIFICATION_AUTHORITY.toBase58()
  //          }
  //        }
  //      ]
  //     });

  //     const handles = twitterHandles.map(t => {
  //       const owner = new PublicKey(t.account.data.slice(32, 64));
  //       const name = t.account.data.slice(96, 114).toString();
  //     });

  //     console.log(handles);

  //   })();
  // }, [whitelistedCreatorsByCreator]);

  return (
    <MetaContext.Provider
      value={{
        metadata: filteredMetadata,
        unfilteredMetadata: metadata,
        editions,
        masterEditions,
        auctionManagersByAuction,
        auctions,
        metadataByMint,
        safetyDepositBoxesByVaultAndIndex,
        bidderMetadataByAuctionAndBidder,
        bidderPotsByAuctionAndBidder,
        vaults,
        bidRedemptions,
        masterEditionsByPrintingMint,
        metadataByMasterEdition,
        whitelistedCreatorsByCreator,
        store,
        payoutTickets,
        isLoading,
        masterEditionsByOneTimeAuthMint,
      }}
    >
      {children}
    </MetaContext.Provider>
  );
}

const queryExtendedMetadata = async (
  connection: Connection,
  mintToMeta: Record<string, ParsedAccount<Metadata>>,
) => {
  const mintToMetadata = { ...mintToMeta };

  const mints = await getMultipleAccounts(
    connection,
    [...Object.keys(mintToMetadata)].filter(k => !cache.get(k)),
    'single',
  );

  mints.keys.forEach((key, index) => {
    const mintAccount = mints.array[index];
    if (mintAccount) {
      const mint = cache.add(
        key,
        mintAccount,
        MintParser,
      ) as ParsedAccount<MintInfo>;
      if (mint.info.supply.gt(new BN(1)) || mint.info.decimals !== 0) {
        // naive not NFT check
        delete mintToMetadata[key];
      } else {
        // const metadata = mintToMetadata[key];
      }
    }
  });

  // await Promise.all([...extendedMetadataFetch.values()]);

  const metadata = [...Object.values(mintToMetadata)];

  return {
    metadata,
    mintToMetadata,
  };
};

export const useMeta = () => {
  const context = useContext(MetaContext);
  return context as MetaContextState;
};

function isValidHttpUrl(text: string) {
  let url;

  try {
    url = new URL(text);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

const processAuctions = (
  a: PublicKeyAndAccount<Buffer>,
  setAuctions: any,
  setBidderMetadataByAuctionAndBidder: any,
  setBidderPotsByAuctionAndBidder: any,
) => {
  if (a.account.owner.toBase58() != programIds().auction.toBase58()) return;

  try {
    const account = cache.add(
      a.pubkey,
      a.account,
      AuctionParser,
    ) as ParsedAccount<AuctionData>;

    setAuctions((e: any) => ({
      ...e,
      [a.pubkey.toBase58()]: account,
    }));
  } catch (e) {
    // ignore errors
    // add type as first byte for easier deserialization
  }
  try {
    if (a.account.data.length === BIDDER_METADATA_LEN) {
      const account = cache.add(
        a.pubkey,
        a.account,
        BidderMetadataParser,
      ) as ParsedAccount<BidderMetadata>;
      setBidderMetadataByAuctionAndBidder((e: any) => ({
        ...e,
        [account.info.auctionPubkey.toBase58() +
        '-' +
        account.info.bidderPubkey.toBase58()]: account,
      }));
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
  try {
    if (a.account.data.length === BIDDER_POT_LEN) {
      const account = cache.add(
        a.pubkey,
        a.account,
        BidderPotParser,
      ) as ParsedAccount<BidderPot>;

      setBidderPotsByAuctionAndBidder((e: any) => ({
        ...e,
        [account.info.auctionAct.toBase58() +
        '-' +
        account.info.bidderAct.toBase58()]: account,
      }));
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const processMetaplexAccounts = async (
  a: PublicKeyAndAccount<Buffer>,
  setAuctionManagersByAuction: any,
  setBidRedemptions: any,
  setPayoutTickets: any,
  setStore: any,
  setWhitelistedCreatorsByCreator: any,
) => {
  if (a.account.owner.toBase58() != programIds().metaplex.toBase58()) return;

  try {
    const STORE_ID = programIds().store.toBase58();

    if (
      a.account.data[0] === MetaplexKey.AuctionManagerV1 ||
      a.account.data[0] === 0
    ) {
      const storeKey = new PublicKey(a.account.data.slice(1, 33));
      if (storeKey.toBase58() === STORE_ID) {
        const auctionManager = decodeAuctionManager(a.account.data);
        // An initialized auction manager hasnt been validated, so we cant show it to users.
        // Could have any kind of pictures in it.
        if (auctionManager.state.status !== AuctionManagerStatus.Initialized) {
          const account: ParsedAccount<AuctionManager> = {
            pubkey: a.pubkey,
            account: a.account,
            info: auctionManager,
          };
          setAuctionManagersByAuction((e: any) => ({
            ...e,
            [auctionManager.auction.toBase58()]: account,
          }));
        }
      }
    } else if (a.account.data[0] === MetaplexKey.BidRedemptionTicketV1) {
      const ticket = decodeBidRedemptionTicket(a.account.data);
      const account: ParsedAccount<BidRedemptionTicket> = {
        pubkey: a.pubkey,
        account: a.account,
        info: ticket,
      };
      setBidRedemptions((e: any) => ({
        ...e,
        [a.pubkey.toBase58()]: account,
      }));
    } else if (a.account.data[0] === MetaplexKey.PayoutTicketV1) {
      const ticket = decodePayoutTicket(a.account.data);
      const account: ParsedAccount<PayoutTicket> = {
        pubkey: a.pubkey,
        account: a.account,
        info: ticket,
      };
      setPayoutTickets((e: any) => ({
        ...e,
        [a.pubkey.toBase58()]: account,
      }));
    } else if (a.account.data[0] === MetaplexKey.StoreV1) {
      const store = decodeStore(a.account.data);
      console.log('Found store', store);
      const account: ParsedAccount<Store> = {
        pubkey: a.pubkey,
        account: a.account,
        info: store,
      };
      if (a.pubkey.toBase58() === STORE_ID) {
        setStore(account);
      }
    } else if (a.account.data[0] === MetaplexKey.WhitelistedCreatorV1) {
      const whitelistedCreator = decodeWhitelistedCreator(a.account.data);
      const creatorKeyIfCreatorWasPartOfThisStore = await getWhitelistedCreator(
        whitelistedCreator.address,
      );
      if (
        creatorKeyIfCreatorWasPartOfThisStore.toBase58() == a.pubkey.toBase58()
      ) {
        const account = cache.add(
          a.pubkey,
          a.account,
          WhitelistedCreatorParser,
        ) as ParsedAccount<WhitelistedCreator>;

        const nameInfo = (names as any)[account.info.address.toBase58()];
        if (nameInfo) {
          account.info.name = nameInfo.name;
          account.info.description = nameInfo.description;
          account.info.image = nameInfo.image;
          account.info.twitter = nameInfo.twitter;
        }

        setWhitelistedCreatorsByCreator((e: any) => ({
          ...e,
          [whitelistedCreator.address.toBase58()]: account,
        }));
      }
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const processMetaData = async (
  meta: PublicKeyAndAccount<Buffer>,
  setMetadataByMint: any,
  setMetadataByMasterEdition: any,
  setEditions: any,
  setMasterEditions: any,
  setmasterEditionsByPrintingMint: any,
  setMasterEditionsByOneTimeAuthMint: any,
) => {
  if (meta.account.owner.toBase58() != programIds().metadata.toBase58()) return;

  try {
    if (
      meta.account.data[0] === MetadataKey.MetadataV1 ||
      meta.account.data[0] === 0
    ) {
      const metadata = await decodeMetadata(meta.account.data);

      if (
        isValidHttpUrl(metadata.data.uri) &&
        metadata.data.uri.indexOf('arweave') >= 0
      ) {
        const account: ParsedAccount<Metadata> = {
          pubkey: meta.pubkey,
          account: meta.account,
          info: metadata,
        };
        setMetadataByMint((e: any) => ({
          ...e,
          [metadata.mint.toBase58()]: account,
        }));
        setMetadataByMasterEdition((e: any) => ({
          ...e,
          [metadata.masterEdition?.toBase58() || '']: account,
        }));
      }
    } else if (meta.account.data[0] === MetadataKey.EditionV1) {
      const edition = decodeEdition(meta.account.data);
      const account: ParsedAccount<Edition> = {
        pubkey: meta.pubkey,
        account: meta.account,
        info: edition,
      };
      setEditions((e: any) => ({ ...e, [meta.pubkey.toBase58()]: account }));
    } else if (meta.account.data[0] === MetadataKey.MasterEditionV1) {
      const masterEdition = decodeMasterEdition(meta.account.data);
      const account: ParsedAccount<MasterEdition> = {
        pubkey: meta.pubkey,
        account: meta.account,
        info: masterEdition,
      };
      setMasterEditions((e: any) => ({
        ...e,
        [meta.pubkey.toBase58()]: account,
      }));
      setmasterEditionsByPrintingMint((e: any) => ({
        ...e,
        [masterEdition.printingMint.toBase58()]: account,
      }));
      setMasterEditionsByOneTimeAuthMint((e: any) => ({
        ...e,
        [masterEdition.oneTimePrintingAuthorizationMint.toBase58()]: account,
      }));
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const processVaultData = (
  a: PublicKeyAndAccount<Buffer>,
  setSafetyDepositBoxesByVaultAndIndex: any,
  setVaults: any,
) => {
  if (a.account.owner.toBase58() != programIds().vault.toBase58()) return;
  try {
    if (a.account.data[0] === VaultKey.SafetyDepositBoxV1) {
      const safetyDeposit = decodeSafetyDeposit(a.account.data);
      const account: ParsedAccount<SafetyDepositBox> = {
        pubkey: a.pubkey,
        account: a.account,
        info: safetyDeposit,
      };
      setSafetyDepositBoxesByVaultAndIndex((e: any) => ({
        ...e,
        [safetyDeposit.vault.toBase58() + '-' + safetyDeposit.order]: account,
      }));
    } else if (
      a.account.data[0] === VaultKey.VaultV1 ||
      a.account.data[0] === 0
    ) {
      const vault = decodeVault(a.account.data);
      const account: ParsedAccount<Vault> = {
        pubkey: a.pubkey,
        account: a.account,
        info: vault,
      };
      setVaults((e: any) => ({
        ...e,
        [a.pubkey.toBase58()]: account,
      }));
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};
