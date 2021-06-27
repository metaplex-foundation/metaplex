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
  useWallet,
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

interface MetaState {
  metadata: ParsedAccount<Metadata>[];
  metadataByMint: Record<string, ParsedAccount<Metadata>>;
  metadataByMasterEdition: Record<string, ParsedAccount<Metadata>>;
  editions: Record<string, ParsedAccount<Edition>>;
  masterEditions: Record<string, ParsedAccount<MasterEdition>>;
  masterEditionsByPrintingMint: Record<string, ParsedAccount<MasterEdition>>;
  masterEditionsByOneTimeAuthMint: Record<string, ParsedAccount<MasterEdition>>;
  auctionManagersByAuction: Record<string, ParsedAccount<AuctionManager>>;
  auctions: Record<string, ParsedAccount<AuctionData>>;
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

const { MetadataKey } = actions;

type UpdateStateValueFunc = (prop: keyof MetaState, key: string, value: any) => void;
export interface MetaContextState extends MetaState {
  isLoading: boolean;
}

const isMetadataPartOfStore = (m: ParsedAccount<Metadata> , store: ParsedAccount<Store> | null, whitelistedCreatorsByCreator: Record<
  string,
  ParsedAccount<WhitelistedCreator>
>) => {
  if(!m?.info?.data?.creators) {
    return false;
  }

  return m.info.data.creators.findIndex(
      c =>
        c.verified &&
        store &&
        store.info &&
        (store.info.public ||
          whitelistedCreatorsByCreator[c.address.toBase58()]?.info
            ?.activated),
    ) >= 0;
}

const MetaContext = React.createContext<MetaContextState>({
  metadata: [],
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

  const [state, setState] = useState<MetaState>({
    metadata: [] as Array<ParsedAccount<Metadata>>,
    metadataByMint: {} as Record<string, ParsedAccount<Metadata>>,
    masterEditions: {} as Record<string, ParsedAccount<MasterEdition>>,
    masterEditionsByPrintingMint: {} as Record<string, ParsedAccount<MasterEdition>>,
    masterEditionsByOneTimeAuthMint: {} as Record<string, ParsedAccount<MasterEdition>>,
    metadataByMasterEdition: {} as any,
    editions: {},
    auctionManagersByAuction: {},
    bidRedemptions: {},
    auctions: {},
    vaults: {},
    payoutTickets: {},
    store: null as ParsedAccount<Store> | null,
    whitelistedCreatorsByCreator: {},
    bidderMetadataByAuctionAndBidder: {},
    bidderPotsByAuctionAndBidder: {},
    safetyDepositBoxesByVaultAndIndex: {},
  })

  const [isLoading, setIsLoading] = useState(true);

  const updateMints = useCallback(
    async metadataByMint => {
      try {
        const m = await queryExtendedMetadata(connection, metadataByMint);
        setState((current) => ({
          ...current,
          metadata: m.metadata,
          metadataByMint: m.mintToMetadata,
        }))
      } catch (er) {
        console.error(er);
      }
    },
    [setState],
  );

  useEffect(() => {
    let dispose = () => {};
    (async () => {
      console.log('-----> Query started');
      const accounts = (
        await Promise.all([
          connection.getProgramAccounts(programIds().vault),
          connection.getProgramAccounts(programIds().auction),
          connection.getProgramAccounts(programIds().metadata),
          connection.getProgramAccounts(programIds().metaplex),
        ])
      ).flat();

      await setProgramIds(env);

      console.log('------->Query finished');

      const tempCache: MetaState = {
        metadata: [],
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
        store: null,
        whitelistedCreatorsByCreator: {},
        bidderMetadataByAuctionAndBidder: {},
        bidderPotsByAuctionAndBidder: {},
        safetyDepositBoxesByVaultAndIndex: {},
      };

      const updateTemp = (prop: keyof MetaState, key: string, value: any) => {
        if (prop === 'store') {
          tempCache[prop] = value;
        } else if(tempCache[prop]) {
          const bucket = tempCache[prop] as any;
          bucket[key] = value as any;
        }
      }

      for (let i = 0; i < accounts.length; i++) {
        let account = accounts[i];
        processVaultData(account, updateTemp);
        processAuctions(account, updateTemp);
        processMetaData(account, updateTemp);

        await processMetaplexAccounts(
          account,
          updateTemp,
        );
      }

      const values = Object.values(tempCache.metadataByMint) as ParsedAccount<Metadata>[];
      for (let i = 0; i < values.length; i++) {
        const metadata = values[i];
        if(isMetadataPartOfStore(metadata, tempCache.store, tempCache.whitelistedCreatorsByCreator)) {
          await metadata.info.init();
          tempCache.metadataByMasterEdition[metadata.info?.masterEdition?.toBase58() || ''] = metadata;
        } else {
          delete tempCache.metadataByMint[metadata.info.mint.toBase58() || ''];
        }
      }

      console.log('------->init finished');
      tempCache.metadata = values;
      setState({
        ...tempCache,
      })

      setIsLoading(false);
      console.log('------->set finished');

      updateMints(tempCache.metadataByMint);
    })();

    return () => {
      dispose();
    };
  }, [
    connection,
    setState,
    updateMints,
    env,
  ]);

  const updateStateValue = useMemo(() => (prop: keyof MetaState, key: string, value: any) => {
    setState((current) => {
      if (prop === 'store') {
        return {
          ...current,
          [prop]: value,
        }
      } else {
        return ({
          ...current,
          [prop]: {
            ...current[prop],
            [key]: value
          }
        });
      }
  });
  }, [setState]);

  const store = state.store;
  const whitelistedCreatorsByCreator = state.whitelistedCreatorsByCreator;
  useEffect(() => {
    if(isLoading) {
      return;
    }

    let vaultSubId = connection.onProgramAccountChange(
      programIds().vault,
      async info => {
        const pubkey =
          typeof info.accountId === 'string'
            ? new PublicKey(info.accountId as unknown as string)
            : info.accountId;
        processVaultData(
          {
            pubkey,
            account: info.accountInfo,
          },
          updateStateValue,
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
          updateStateValue,
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
        const result = processMetaData(
          {
            pubkey,
            account: info.accountInfo,
          },
          updateStateValue,
        );

        if(result && isMetadataPartOfStore(result, store, whitelistedCreatorsByCreator)) {
          await result.info.init();
          setState((data) => ({
            ...data,
            metadata: [...data.metadata.filter(m => m.pubkey.equals(pubkey)), result],
            metadataByMasterEdition: {
              ...data.metadataByMasterEdition,
              [result.info.masterEdition?.toBase58() || '']: result,
            },
            metadataByMint: {
              ...data.metadataByMint,
              [result.info.mint.toBase58()]: result
            }
          }));
        }
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
          updateStateValue
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
    updateStateValue,
    setState,
    updateMints,
    store,
    whitelistedCreatorsByCreator,
    isLoading,
  ]);

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
        metadata: state.metadata,
        editions: state.editions,
        masterEditions: state.masterEditions,
        auctionManagersByAuction: state.auctionManagersByAuction,
        auctions: state.auctions,
        metadataByMint: state.metadataByMint,
        safetyDepositBoxesByVaultAndIndex: state.safetyDepositBoxesByVaultAndIndex,
        bidderMetadataByAuctionAndBidder: state.bidderMetadataByAuctionAndBidder,
        bidderPotsByAuctionAndBidder: state.bidderPotsByAuctionAndBidder,
        vaults: state.vaults,
        bidRedemptions: state.bidRedemptions,
        masterEditionsByPrintingMint: state.masterEditionsByPrintingMint,
        metadataByMasterEdition: state.metadataByMasterEdition,
        whitelistedCreatorsByCreator: state.whitelistedCreatorsByCreator,
        store: state.store,
        payoutTickets: state.payoutTickets,
        masterEditionsByOneTimeAuthMint: state.masterEditionsByOneTimeAuthMint,
        isLoading,
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
        false,
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
  setter: UpdateStateValueFunc,
) => {
  if (a.account.owner.toBase58() !== programIds().auction.toBase58()) return;

  try {
    const account = cache.add(
      a.pubkey,
      a.account,
      AuctionParser,
      false,
    ) as ParsedAccount<AuctionData>;
    setter('auctions', a.pubkey.toBase58(), account);
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
        false,
      ) as ParsedAccount<BidderMetadata>;
      setter(
        'bidderMetadataByAuctionAndBidder',
        account.info.auctionPubkey.toBase58() +
        '-' +
        account.info.bidderPubkey.toBase58(),
        account);
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
        false,
      ) as ParsedAccount<BidderPot>;
      setter(
        'bidderPotsByAuctionAndBidder',
        account.info.auctionAct.toBase58() +
        '-' +
        account.info.bidderAct.toBase58(),
        account);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const processMetaplexAccounts = async (
  a: PublicKeyAndAccount<Buffer>,
  setter: UpdateStateValueFunc,
) => {
  if (a.account.owner.toBase58() !== programIds().metaplex.toBase58()) return;

  try {
    const STORE_ID = programIds().store?.toBase58() || '';

    if (a.account.data[0] === MetaplexKey.AuctionManagerV1) {
      const storeKey = new PublicKey(a.account.data.slice(1, 33));
      if (storeKey.toBase58() === STORE_ID) {
        const auctionManager = decodeAuctionManager(a.account.data);
        // An initialized auction manager hasnt been validated, so we cant show it to users unless you're
        // the one who made it, in which case we want it in memory so we can serve it as part of the Defective
        // type of view for use in unwinding.
        // Could have any kind of pictures in it.
        if (
          auctionManager.state.status !== AuctionManagerStatus.Initialized ||
          auctionManager.state.status === AuctionManagerStatus.Initialized
        ) {
          const account: ParsedAccount<AuctionManager> = {
            pubkey: a.pubkey,
            account: a.account,
            info: auctionManager,
          };
          setter('auctionManagersByAuction', auctionManager.auction.toBase58(), account);
        }
      }
    } else if (a.account.data[0] === MetaplexKey.BidRedemptionTicketV1) {
      const ticket = decodeBidRedemptionTicket(a.account.data);
      const account: ParsedAccount<BidRedemptionTicket> = {
        pubkey: a.pubkey,
        account: a.account,
        info: ticket,
      };
      setter('bidRedemptions', a.pubkey.toBase58(), account);
    } else if (a.account.data[0] === MetaplexKey.PayoutTicketV1) {
      const ticket = decodePayoutTicket(a.account.data);
      const account: ParsedAccount<PayoutTicket> = {
        pubkey: a.pubkey,
        account: a.account,
        info: ticket,
      };
      setter('payoutTickets', a.pubkey.toBase58(), account);
    } else if (a.account.data[0] === MetaplexKey.StoreV1) {
      const store = decodeStore(a.account.data);
      const account: ParsedAccount<Store> = {
        pubkey: a.pubkey,
        account: a.account,
        info: store,
      };
      if (a.pubkey.toBase58() === STORE_ID) {
        setter('store', a.pubkey.toBase58(), account);
      }
    } else if (a.account.data[0] === MetaplexKey.WhitelistedCreatorV1) {
      const whitelistedCreator = decodeWhitelistedCreator(a.account.data);

      // TODO: figure out a way to avoid generating creator addresses during parsing
      // should we store store id inside creator?
      const creatorKeyIfCreatorWasPartOfThisStore = await getWhitelistedCreator(
        whitelistedCreator.address,
      );
      if (
        creatorKeyIfCreatorWasPartOfThisStore.toBase58() === a.pubkey.toBase58()
      ) {
        const account = cache.add(
          a.pubkey,
          a.account,
          WhitelistedCreatorParser,
          false,
        ) as ParsedAccount<WhitelistedCreator>;

        const nameInfo = (names as any)[account.info.address.toBase58()];
        if (nameInfo) {
          account.info.name = nameInfo.name;
          account.info.description = nameInfo.description;
          account.info.image = nameInfo.image;
          account.info.twitter = nameInfo.twitter;
        }
        setter('whitelistedCreatorsByCreator', whitelistedCreator.address.toBase58(), account);
      }
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const processMetaData = (
  meta: PublicKeyAndAccount<Buffer>,
  setter: UpdateStateValueFunc,
) => {
  if (meta.account.owner.toBase58() !== programIds().metadata.toBase58()) return;

  try {
    if (meta.account.data[0] === MetadataKey.MetadataV1) {
      const metadata = decodeMetadata(meta.account.data);

      if (
        isValidHttpUrl(metadata.data.uri) &&
        metadata.data.uri.indexOf('arweave') >= 0
      ) {
        const account: ParsedAccount<Metadata> = {
          pubkey: meta.pubkey,
          account: meta.account,
          info: metadata,
        };
        setter('metadataByMint', metadata.mint.toBase58(), account);
        return account;
      }
    } else if (meta.account.data[0] === MetadataKey.EditionV1) {
      const edition = decodeEdition(meta.account.data);
      const account: ParsedAccount<Edition> = {
        pubkey: meta.pubkey,
        account: meta.account,
        info: edition,
      };
      setter('editions', meta.pubkey.toBase58(), account);
    } else if (meta.account.data[0] === MetadataKey.MasterEditionV1) {
      const masterEdition = decodeMasterEdition(meta.account.data);
      const account: ParsedAccount<MasterEdition> = {
        pubkey: meta.pubkey,
        account: meta.account,
        info: masterEdition,
      };
      setter('masterEditions', meta.pubkey.toBase58(), account);
      setter('masterEditionsByPrintingMint', masterEdition.printingMint.toBase58(), account);
      setter('masterEditionsByOneTimeAuthMint', masterEdition.oneTimePrintingAuthorizationMint.toBase58(), account);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const processVaultData = (
  a: PublicKeyAndAccount<Buffer>,
  setter: UpdateStateValueFunc,
) => {
  if (a.account.owner.toBase58() !== programIds().vault.toBase58()) return;
  try {
    if (a.account.data[0] === VaultKey.SafetyDepositBoxV1) {
      const safetyDeposit = decodeSafetyDeposit(a.account.data);
      const account: ParsedAccount<SafetyDepositBox> = {
        pubkey: a.pubkey,
        account: a.account,
        info: safetyDeposit,
      };
      setter(
        'safetyDepositBoxesByVaultAndIndex',
        safetyDeposit.vault.toBase58() + '-' + safetyDeposit.order,
        account);
    } else if (a.account.data[0] === VaultKey.VaultV1) {
      const vault = decodeVault(a.account.data);
      const account: ParsedAccount<Vault> = {
        pubkey: a.pubkey,
        account: a.account,
        info: vault,
      };

      setter(
        'vaults',
        a.pubkey.toBase58(),
        account);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};
