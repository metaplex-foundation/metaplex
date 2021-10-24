import { AccountInfo, Connection } from "@solana/web3.js";
import { MongoClient } from "mongodb";
import { accountConverterSet, StoreAccountDocument } from "../accounts/account";
import { AUCTION_ID, METAPLEX_ID, toPublicKey, VAULT_ID } from "../ids";
import { getMultipleAccounts, getProgramAccounts } from "../rpc";
import * as mongoUtils from "../../db/mongo-utils";
import {
  AuctionManagerAccountDocument,
  AuctionManagerV1,
  AuctionManagerV2,
  decodeAuctionManager,
} from "../accounts/auctionManager";
import {
  DB,
  AUCTION_MANAGERS_COLLECTION,
  SAFETY_DEPOSIT_BOX_COLLECTION,
  SAFETY_DEPOSIT_CONFIG_COLLECTION,
  AUCTION_COLLECTION,
  AUCTION_DATA_EXTENDED_COLLECTION,
  METADATA_COLLECTION,
  BIDDER_METADATA_COLLECTION,
  BIDDER_POT_COLLECTION,
} from "../../db/mongo-utils";
import { decodeVault, VaultAccountDocument } from "../accounts/vault";
import BN from "bn.js";
import {
  decodeSafetyDeposit,
  SafetyDepositBox,
  SafetyDepositBoxAccountDocument,
} from "../accounts/safetyDepositBox";
import {
  decodeMasterEdition,
  decodeMetadata,
  MasterEditionV1,
  MasterEditionV1AccountDocument,
  Metadata,
  MetadataAccountDocument,
} from "../accounts/metadata";
import {
  decodeSafetyDepositConfig,
  SafetyDepositConfig,
  SafetyDepositConfigAccountDocument,
} from "../accounts/safetyDepositConfig";
import { ConverterSet } from "../serialization/converterSet";
import { bnConverter } from "../serialization/converters/bnConverter";
import {
  decodeAuctionData,
  decodeAuctionDataExtended,
} from "../accounts/auction";
import _ from "lodash";
import { MetaplexKey } from "../accounts/types";
import { deserializeMint, fromLamports } from "../accounts/mint";
import { BidderMetadataStoreAccountDocument, BIDDER_METADATA_LEN, decodeBidderMetadata } from "../accounts/bidderMetadata";
import { BidderPotStoreAccountDocument, BIDDER_POT_LEN, decodeBidderPot } from "../accounts/bidderPot";

export const loadAuctionManagers = async (
  store: string,
  connection: Connection,
  client: MongoClient
) => {
  const v1Filters = [
    {
      memcmp: {
        offset: 0,
        bytes: "8",
      },
    },
    {
      memcmp: {
        offset: 1,
        bytes: toPublicKey(store).toBase58(),
      },
    },
  ];

  const v2Filters = [
    {
      memcmp: {
        offset: 0,
        bytes: "B",
      },
    },
    {
      memcmp: {
        offset: 1,
        bytes: toPublicKey(store).toBase58(),
      },
    },
  ];

  const v1Managers = await getProgramAccounts(
    connection,
    METAPLEX_ID,
    v1Filters
  );

  const v2Managers = await getProgramAccounts(
    connection,
    METAPLEX_ID,
    v2Filters
  );

  const rawManagers = v1Managers.concat(v2Managers);

  const decodedManagers = rawManagers.map((mgr) =>
    decodeAuctionManager(mgr.account.data)
  );

  const managers: {
    account: AccountInfo<Buffer>;
    pubkey: string;
    decoded: AuctionManagerV1 | AuctionManagerV2;
    collection: string | undefined;
    metadataPubkey?: string;
    price: number | undefined;
  }[] = decodedManagers.map((dm, i) => ({
    account: rawManagers[i].account,
    pubkey: rawManagers[i].pubkey,
    decoded: dm,
    collection: undefined,
    price: undefined,
  }));

  const vaults = decodedManagers.map((mgr) => mgr.vault);
  const auctionKeys = decodedManagers.map((mgr) => mgr.auction);
  await loadVaults(store, connection, client, vaults);
  const boxes = await loadSafetyDepositBoxes(store, connection, client, vaults);
  const configs = await loadDepositSafetyConfigs(
    store,
    connection,
    client,
    managers.map((mgr) => mgr.pubkey)
  );
  const auctions = await loadAuctions(store, connection, client, auctionKeys);

  const auctionsWithExtendedData = auctions.filter(
    (auction) => auction.info.auctionDataExtended
  );

  const extKeysFromV2 = managers
    .map((mgr) => mgr.decoded)
    .filter((d) => d.key === MetaplexKey.AuctionManagerV2)
    .map((mgr) => mgr as AuctionManagerV2)
    .filter((mgr) => mgr.auctionDataExtended)
    .map((mgr) => (mgr as AuctionManagerV2).auctionDataExtended!);

  const extendedAuctionKeys = auctionsWithExtendedData
    .map((auction) => auction.info.auctionDataExtended!)
    .concat(extKeysFromV2);

  const auctionDataExtended = await loadAuctionDataExtended(
    store,
    connection,
    client,
    extendedAuctionKeys
  );

  await loadBidderMetadata(store, connection, client, managers.map(m => m.pubkey));
  await loadBidderPots(store, connection, client, managers.map(m => m.pubkey));

  const boxesByVault = _.groupBy(boxes, (b) => b.info.vault);
  const auctionByPubkey = new Map(auctions.map((m) => [m.pubkey, m.info]));
  const configsByAuctionManager = _.groupBy(
    configs,
    (c) => c.info.auctionManager
  );

  const auctionDataExtendedByPubkey = new Map(
    auctionDataExtended.map((ext) => [ext.pubkey, ext.info])
  );

  const mdLookup = async (mint: string) => {
    const coll = client
      .db(DB)
      .collection<MetadataAccountDocument>(METADATA_COLLECTION);

    const res = await coll.findOne({ mint: mint });

    if (res) {
      accountConverterSet.revertConversion(res);
    }

    return res
      ? { pubkey: res.pubkey, metadata: decodeMetadata(res.account.data) }
      : undefined;
  };

  const mdCollLookup = async (mint: string) => {
    const coll = client
      .db(DB)
      .collection<MetadataAccountDocument>(METADATA_COLLECTION);
    const res = await coll.findOne({ mint: mint });
    if (res) {
      accountConverterSet.revertConversion(res);
    }
    return res ? res.collection : undefined;
  };

  const mdByMasterEdLookup = async (masterEdition: string) => {
    const coll = client
      .db(DB)
      .collection<MetadataAccountDocument>(METADATA_COLLECTION);
    const res = await coll.findOne({ masterEdition: masterEdition });
    if (res) {
      accountConverterSet.revertConversion(res);
    }
    return res
      ? { pubkey: res.pubkey, metadata: decodeMetadata(res.account.data) }
      : undefined;
  };

  const masterByPrintMint = async (printMint: string) => {
    const coll = client
      .db(DB)
      .collection<MasterEditionV1AccountDocument>(METADATA_COLLECTION);
    const res = await coll.findOne({ printingMint: printMint });
    if (res) {
      accountConverterSet.revertConversion(res);
    }
    return res
      ? {
          pubkey: res.pubkey,
          edition: decodeMasterEdition(res.account.data) as MasterEditionV1,
        }
      : undefined;
  };

  const extractCollectionAndTokenPriceFromMetadata = async (
    metadata: Metadata,
    auctionExt: string | undefined,
    biddingMint: string
  ) => {
    const collection = await mdCollLookup(metadata.mint);
    let price: number | undefined = undefined;

    //TODO: optimize this
    const mints = await getMultipleAccounts(
      connection,
      [biddingMint],
      "recent"
    );

    if (mints.keys.length && auctionExt) {
      const mintAccount = mints.array[0];
      const buffer = Buffer.from(mintAccount.data);
      const mintInfo = deserializeMint(buffer);
      const ext = auctionDataExtendedByPubkey.get(auctionExt);
      if (ext?.instantSalePrice) {
        price = fromLamports(ext?.instantSalePrice, mintInfo);
      }
    }

    return {
      collection,
      price,
    };
  };

  //Load collection info and price
  for (const mgr of managers) {
    if (mgr.decoded.key === MetaplexKey.AuctionManagerV1) {
      const metadataCollection = await getMetadataFromAuctionV1(
        mgr.decoded as AuctionManagerV1,
        boxesByVault[mgr.decoded.vault].map((b) => b.info),
        mdLookup,
        masterByPrintMint,
        mdByMasterEdLookup
      );
      if (metadataCollection.length) {
        const metadata = metadataCollection[0];
        const auctionPubkey = mgr.decoded.auction;
        const auction = auctionByPubkey.get(auctionPubkey);

        const { collection, price } =
          await extractCollectionAndTokenPriceFromMetadata(
            metadata.metadata,
            auction!.auctionDataExtended!,
            auction!.tokenMint
          );

        mgr.collection = collection;
        mgr.price = price;
        mgr.metadataPubkey = metadata.pubkey;
      }
    } else {
      const auctionPubkey = mgr.decoded.auction;
      const auction = auctionByPubkey.get(auctionPubkey);

      const numberOfWinners = auction!.bidState.max.toNumber();
      const configs = configsByAuctionManager[mgr.pubkey].map(
        (cfg) => cfg.info
      );
      const boxes = boxesByVault[mgr.decoded.vault].map((b) => b.info);

      const metadataCollection = await getMetadataFromAuctionV2(
        numberOfWinners,
        configs,
        boxes,
        mdLookup
      );

      if (metadataCollection.length) {
        const { collection, price } =
          await extractCollectionAndTokenPriceFromMetadata(
            metadataCollection[0].metadata,
            (mgr.decoded as AuctionManagerV2).auctionDataExtended,
            auction!.tokenMint
          );
        mgr.collection = collection;
        mgr.price = price;
        mgr.metadataPubkey = metadataCollection[0].pubkey;
      }
    }
  }

  const docs = managers.map(
    (mgr) =>
      new AuctionManagerAccountDocument(
        store,
        mgr.account,
        mgr.pubkey,
        mgr.decoded.auction,
        mgr.collection,
        mgr.price,
        mgr.metadataPubkey!
      )
  );

  const auctionManagerCollection = client
    .db(DB)
    .collection(AUCTION_MANAGERS_COLLECTION);

  await auctionManagerCollection.deleteMany({});
  await auctionManagerCollection.createIndex({ store: 1 });
  await auctionManagerCollection.createIndex({ pubkey: 1 });
  await auctionManagerCollection.createIndex({ auction: 1 });
  await auctionManagerCollection.createIndex({ collection: 1 });

  if (docs.length) {
    await auctionManagerCollection.insertMany(docs);
  }
};

const loadVaults = async (
  store: string,
  connection: Connection,
  client: MongoClient,
  keys: string[]
) => {
  const vaultAccounts = await getMultipleAccounts(connection, keys, "recent");

  const docs = vaultAccounts.keys.map((key, i) => {
    const account = vaultAccounts.array[i];
    const decodedVault = decodeVault(account.data);
    return new VaultAccountDocument(
      store,
      key,
      account,
      decodedVault.authority,
      decodedVault.state,
      decodedVault.tokenTypeCount
    );
  });

  const coll = client.db(DB).collection(mongoUtils.VAULTS_COLLECTION);
  await coll.deleteMany({ store: store });
  await coll.createIndex({ store: 1 });
  await coll.createIndex({ pubkey: 1 });

  if (docs.length) {
    await coll.insertMany(docs);
  }
};

type mdLookup = (
  mint: string
) => Promise<{ pubkey: string; metadata: Metadata } | undefined>;
type masterEdByPrintingMintLookup = (
  mint: string
) => Promise<{ pubkey: string; edition: MasterEditionV1 } | undefined>;

const getMetadataFromAuctionV1 = async (
  mgr: AuctionManagerV1,
  boxes: SafetyDepositBox[],
  mdByMint: mdLookup,
  masterEdByPrintMint: masterEdByPrintingMintLookup,
  mdByMasterEdLookup: mdLookup
) => {
  const items: { pubkey: string; metadata: Metadata }[] = [];

  for (const config of mgr.settings.winningConfigs) {
    for (const item of config.items) {
      const boxMint = boxes[item.safetyDepositBoxIndex]?.tokenMint;

      let metadata = await mdByMint(boxMint);

      if (!metadata) {
        // Means is a limited edition v1, so the tokenMint is the printingMint
        const masterEdition = await masterEdByPrintMint(boxMint);

        if (masterEdition) {
          metadata = await mdByMasterEdLookup(masterEdition.pubkey);
        }
      }
      if (metadata) {
        items.push(metadata);
      }
    }
  }

  return items;
};

const getMetadataFromAuctionV2 = async (
  numberOfWinners: number,
  safetyDepositConfigs: SafetyDepositConfig[],
  boxes: SafetyDepositBox[],
  mdByMint: mdLookup
) => {
  const items: { pubkey: string; metadata: Metadata }[] = [];

  for (let i = 0; i < numberOfWinners; i++) {
    for (const config of safetyDepositConfigs) {
      const amount = config.getAmountForWinner(new BN(i));
      if (amount.gt(new BN(0))) {
        const safetyDeposit = boxes[config.order.toNumber()];
        const metadata = await mdByMint(safetyDeposit.tokenMint);
        if (metadata) {
          items.push(metadata!);
        }
      }
    }
  }
  return items;
};

const loadSafetyDepositBoxes = async (
  store: string,
  connection: Connection,
  client: MongoClient,
  vaults: string[]
) => {
  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: "2",
      },
    },
  ];

  const safetyDepositBoxes = await getProgramAccounts(
    connection,
    VAULT_ID,
    filters
  );
  const decodedBoxes = safetyDepositBoxes.map((b) =>
    decodeSafetyDeposit(b.account.data)
  );

  const fullData = safetyDepositBoxes.map((b, i) => {
    return {
      pubkey: b.pubkey,
      account: b.account,
      info: decodedBoxes[i],
    };
  });

  const vaultBoxes = fullData.filter(
    (box) => vaults.indexOf(box.info.vault) != -1
  );

  const docs = vaultBoxes.map(
    (b) =>
      new SafetyDepositBoxAccountDocument(
        store,
        b.account,
        b.pubkey,
        b.info.vault,
        b.info.order
      )
  );
  const collection = client.db(DB).collection(SAFETY_DEPOSIT_BOX_COLLECTION);

  await collection.deleteMany({});
  await collection.createIndex({ store: 1 });
  await collection.createIndex({ pubkey: 1 });
  await collection.createIndex({ vault: 1 });
  await collection.createIndex({ order: 1 });

  if (docs.length > 0) {
    accountConverterSet.applyConversion(docs);
    await collection.insertMany(docs);
  }

  return vaultBoxes;
};

const loadDepositSafetyConfigs = async (
  store: string,
  connection: Connection,
  client: MongoClient,
  auctionManagers: string[]
) => {
  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: "A",
      },
    },
  ];
  const safetyConfigsRaw = await getProgramAccounts(
    connection,
    METAPLEX_ID,
    filters
  );

  const safetyConfigs = safetyConfigsRaw
    .map((config) => ({
      pubkey: config.pubkey,
      account: config.account,
      info: decodeSafetyDepositConfig(config.account.data),
    }))
    .filter(
      (config) => auctionManagers.indexOf(config.info.auctionManager!) != -1
    );

  const docs = safetyConfigs.map(
    (config) =>
      new SafetyDepositConfigAccountDocument(
        store,
        config.pubkey,
        config.account,
        config.info.auctionManager,
        config.info.order
      )
  );

  const collection = client
    .db(DB)
    .collection<SafetyDepositConfigAccountDocument>(
      SAFETY_DEPOSIT_CONFIG_COLLECTION
    );
  await collection.deleteMany({ store: store });
  await collection.createIndex({ store: 1 });
  await collection.createIndex({ pubkey: 1 });
  await collection.createIndex({ auctionManager: 1 });
  await collection.createIndex({ order: 1 });

  if (docs.length) {
    const entries = Array.from(accountConverterSet.entries());
    entries.push(["order", bnConverter]);
    const converters = new ConverterSet(entries);
    converters.applyConversion(docs);
    collection.insertMany(docs);
  }

  return safetyConfigs;
};

const loadAuctions = async (
  store: string,
  connection: Connection,
  client: MongoClient,
  keys: string[]
) => {
  const rawAuctions = await getMultipleAccounts(connection, keys, "recent");
  const auctions = rawAuctions.keys.map((key, i) => {
    const account = rawAuctions.array[i];
    const info = decodeAuctionData(account.data);
    return {
      pubkey: key,
      account: account,
      info: info,
    };
  });

  const docs = auctions.map(
    (auction) =>
      new StoreAccountDocument(store, auction.pubkey, auction.account)
  );
  const collection = client
    .db(DB)
    .collection<StoreAccountDocument>(AUCTION_COLLECTION);

  await collection.deleteMany({});
  await collection.createIndex({ store: 1 });
  await collection.createIndex({ pubkey: 1 });

  if (docs.length) {
    await collection.insertMany(docs);
  }

  return auctions;
};

const loadAuctionDataExtended = async (
  store: string,
  connection: Connection,
  client: MongoClient,
  keys: string[]
) => {
  const rawAuctionDataExtended = await getMultipleAccounts(
    connection,
    keys,
    "recent"
  );

  const auctions = rawAuctionDataExtended.keys.map((key, i) => {
    const account = rawAuctionDataExtended.array[i];
    const info = decodeAuctionDataExtended(account.data);
    return {
      pubkey: key,
      account: account,
      info: info,
    };
  });

  const docs = auctions.map(
    (auction) =>
      new StoreAccountDocument(store, auction.pubkey, auction.account)
  );
  const collection = client
    .db(DB)
    .collection<StoreAccountDocument>(AUCTION_DATA_EXTENDED_COLLECTION);

  await collection.deleteMany({ store: store });
  await collection.createIndex({ store: 1 });
  await collection.createIndex({ pubkey: 1 });

  if (docs.length) {
    await collection.insertMany(docs);
  }

  return auctions;
};

const loadBidderMetadata = async (
    store: string,
    connection: Connection,
    client: MongoClient,
    auctionManagerPubkeys: string[]
  ) => {
      const filters = [
          {
              dataSize : BIDDER_METADATA_LEN
          }
      ]

      const rawBidderMetadata = await getProgramAccounts(connection, AUCTION_ID, filters);

      const docs = rawBidderMetadata.map(rbm => {
          const bm = decodeBidderMetadata(rbm.account.data);
          return new BidderMetadataStoreAccountDocument(
              store,
              rbm.pubkey,
              rbm.account,
              bm.bidderPubkey,
              bm.auctionPubkey
          )
      })

      const collection = client.db(DB).collection(BIDDER_METADATA_COLLECTION);
      await collection.deleteMany({store : store});
      await collection.createIndex({store : 1});
      await collection.createIndex({pubkey :1});
      await collection.createIndex({bidderPubkey : 1});
      await collection.createIndex({auctionPubkey : 1});

      if(docs.length) {
          accountConverterSet.applyConversion(docs);
          await collection.insertMany(docs);
      }
  }

  const loadBidderPots = async (
    store: string,
    connection: Connection,
    client: MongoClient,
    auctionManagerPubkeys: string[]
  ) => {
      const filters = [
          {
              dataSize : BIDDER_POT_LEN
          }
      ]

      const rawBidderPots = await getProgramAccounts(connection, AUCTION_ID, filters);

      const docs = rawBidderPots.map((rbp) => {
        const bp = decodeBidderPot(rbp.account.data);
        return new BidderPotStoreAccountDocument(
          store,
          rbp.pubkey,
          rbp.account,
          bp.bidderAct,
          bp.auctionAct
        );
      });

      const collection = client.db(DB).collection(BIDDER_POT_COLLECTION);
      await collection.deleteMany({ store: store });
      await collection.createIndex({ store: 1 });
      await collection.createIndex({ pubkey: 1 });
      await collection.createIndex({ bidderPubkey: 1 });
      await collection.createIndex({ auctionPubkey: 1 });

      if (docs.length) {
        accountConverterSet.applyConversion(docs);
        await collection.insertMany(docs);
      }
  }