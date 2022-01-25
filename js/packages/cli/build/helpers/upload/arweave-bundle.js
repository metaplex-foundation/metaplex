"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeArweaveBundleUploadGenerator = exports.LAMPORTS = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const arweave_1 = __importDefault(require("arweave"));
const arbundles_1 = require("arbundles");
const loglevel_1 = __importDefault(require("loglevel"));
const storage_type_1 = require("../storage-type");
const mime_1 = require("mime");
const various_1 = require("../various");
const client_1 = __importDefault(require("@bundlr-network/client"));
exports.LAMPORTS = 1000000000;
// The limit for the cumulated size of filepairs to include in a single bundle.
// arBundles has a limit of 250MB, we use our own limit way below that to:
// - account for the bundling overhead (tags, headers, ...)
// - lower the risk of having to re-upload voluminous filepairs
// - lower the risk for OOM crashes of the Node.js process
// - provide feedback to the user as the collection is bundles & uploaded progressively
// Change at your own risk.
const BUNDLE_SIZE_BYTE_LIMIT = 50 * 1024 * 1024;
/**
 * Tags to include with every individual transaction.
 */
const BASE_TAGS = [{ name: 'App-Name', value: 'Metaplex Candy Machine' }];
const contentTypeTags = {
    json: { name: 'Content-Type', value: 'application/json' },
    'arweave-manifest': {
        name: 'Content-Type',
        value: 'application/x.arweave-manifest+json',
    },
};
/**
 * Create an Arweave instance with sane defaults.
 */
function getArweave() {
    return new arweave_1.default({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
        timeout: 20000,
        logging: false,
        logger: console.log,
    });
}
/**
 * Simplistic helper to convert a bytes value to its MB counterpart.
 */
function sizeMB(bytes) {
    const precision = 3;
    const rounder = Math.pow(10, 3);
    return (Math.round((bytes / (1024 * 1024)) * rounder) / rounder).toFixed(precision);
}
/**
 * Create the Arweave Path Manifest from the asset image / manifest
 * pair txIds, helps Arweave Gateways find the files.
 * Instructs arweave gateways to serve metadata.json by default
 * when accessing the transaction.
 * See:
 * - https://github.com/ArweaveTeam/arweave/blob/master/doc/path-manifest-schema.md
 * - https://github.com/metaplex-foundation/metaplex/pull/859#pullrequestreview-805914075
 */
function createArweavePathManifest(imageTxId, manifestTxId, mediaType) {
    const arweavePathManifest = {
        manifest: 'arweave/paths',
        version: '0.1.0',
        paths: {
            [`image${mediaType}`]: {
                id: imageTxId,
            },
            'metadata.json': {
                id: manifestTxId,
            },
        },
        index: {
            path: 'metadata.json',
        },
    };
    return arweavePathManifest;
}
// The size in bytes of a dummy Arweave Path Manifest.
// Used to account for the size of a file pair manifest, in the computation
// of a bundle range.
const dummyAreaveManifestByteSize = (() => {
    const dummyAreaveManifest = createArweavePathManifest('akBSbAEWTf6xDDnrG_BHKaxXjxoGuBnuhMnoYKUCDZo', 'akBSbAEWTf6xDDnrG_BHKaxXjxoGuBnuhMnoYKUCDZo', '.png');
    return Buffer.byteLength(JSON.stringify(dummyAreaveManifest));
})();
/**
 * From a list of file pairs, compute the BundleRange that should be included
 * in a bundle, consisting of one or multiple image + manifest pairs,
 * according to the size of the files to be included in respect of the
 * BUNDLE_SIZE_LIMIT.
 */
async function getBundleRange(filePairs, splitSize = false) {
    let total = 0;
    let count = 0;
    for (const { key, image, manifest } of filePairs) {
        const filePairSize = await [image, manifest].reduce(async (accP, file) => {
            const acc = await accP;
            const { size } = await (0, promises_1.stat)(file);
            return acc + size;
        }, Promise.resolve(dummyAreaveManifestByteSize));
        const limit = splitSize
            ? BUNDLE_SIZE_BYTE_LIMIT * 2
            : BUNDLE_SIZE_BYTE_LIMIT;
        if (total + filePairSize >= limit) {
            if (count === 0) {
                throw new Error(`Image + Manifest filepair (${key}) too big (${sizeMB(filePairSize)}MB) for arBundles size limit of ${sizeMB(BUNDLE_SIZE_BYTE_LIMIT)}MB.`);
            }
            break;
        }
        total += filePairSize;
        count += 1;
    }
    return { count, size: total };
}
const imageTags = [...BASE_TAGS];
/**
 * Retrieve a DataItem which will hold the asset's image binary data
 * & represent an individual Arweave transaction which can be signed & bundled.
 */
async function getImageDataItem(signer, image, contentType) {
    return (0, arbundles_1.createData)(image, signer, {
        tags: imageTags.concat({ name: 'Content-Type', value: contentType }),
    });
}
const manifestTags = [...BASE_TAGS, contentTypeTags['json']];
/**
 * Retrieve a DataItem which will hold the asset's manifest binary data
 * & represent an individual Arweave transaction which can be signed & bundled.
 */
function getManifestDataItem(signer, manifest) {
    return (0, arbundles_1.createData)(JSON.stringify(manifest), signer, { tags: manifestTags });
}
const arweavePathManifestTags = [
    ...BASE_TAGS,
    contentTypeTags['arweave-manifest'],
];
/**
 * Retrieve a DataItem which will hold the Arweave Path Manifest binary data
 * & represent an individual Arweave transaction which can be signed & bundled.
 */
function getArweavePathManifestDataItem(signer, arweavePathManifest) {
    return (0, arbundles_1.createData)(JSON.stringify(arweavePathManifest), signer, {
        tags: arweavePathManifestTags,
    });
}
/**
 * Retrieve an asset's manifest from the filesystem & update it with the link
 * to the asset's image link, obtained from signing the asset image DataItem.
 */
async function getUpdatedManifest(manifestPath, imageLink, contentType) {
    const manifest = JSON.parse((await (0, promises_1.readFile)(manifestPath)).toString());
    manifest.image = imageLink;
    manifest.properties.files = [{ type: contentType, uri: imageLink }];
    return manifest;
}
/**
 * Fetches the corresponding filepair and creates a data item if arweave bundle
 * or creates a bundlr transaction if arweave sol, to basically avoid clashing
 * between data item's id
 */
async function processFiles({ signer, filePair, bundlr, storageType, }) {
    const contentType = (0, mime_1.getType)(filePair.image);
    const imageBuffer = await (0, promises_1.readFile)(filePair.image);
    let imageDataItem;
    let manifestDataItem;
    let arweavePathManifestDataItem;
    if (storageType === storage_type_1.StorageType.ArweaveSol) {
        imageDataItem = bundlr.createTransaction(imageBuffer, {
            tags: imageTags.concat({
                name: 'Content-Type',
                value: contentType,
            }),
        });
        await imageDataItem.sign();
    }
    else if (storageType === storage_type_1.StorageType.ArweaveBundle) {
        imageDataItem = await getImageDataItem(signer, imageBuffer, contentType);
        await imageDataItem.sign(signer);
    }
    const imageLink = `https://arweave.net/${imageDataItem.id}`;
    const manifest = await getUpdatedManifest(filePair.manifest, imageLink, contentType);
    if (storageType === storage_type_1.StorageType.ArweaveSol) {
        manifestDataItem = bundlr.createTransaction(JSON.stringify(manifest), {
            tags: manifestTags,
        });
        await manifestDataItem.sign();
    }
    else if (storageType === storage_type_1.StorageType.ArweaveBundle) {
        manifestDataItem = getManifestDataItem(signer, manifest);
        await manifestDataItem.sign(signer);
    }
    const arweavePathManifest = createArweavePathManifest(imageDataItem.id, manifestDataItem.id, `.${(0, mime_1.getExtension)(contentType)}`);
    if (storageType === storage_type_1.StorageType.ArweaveSol) {
        arweavePathManifestDataItem = bundlr.createTransaction(JSON.stringify(arweavePathManifest), { tags: arweavePathManifestTags });
        await arweavePathManifestDataItem.sign();
        await arweavePathManifestDataItem.sign(signer);
    }
    else if (storageType === storage_type_1.StorageType.ArweaveBundle) {
        arweavePathManifestDataItem = getArweavePathManifestDataItem(signer, arweavePathManifest);
        await arweavePathManifestDataItem.sign(signer);
    }
    return {
        imageDataItem,
        manifestDataItem,
        arweavePathManifestDataItem,
        manifest,
    };
}
/**
 * Initialize the Arweave Bundle Upload Generator.
 * Returns a Generator function that allows to trigger an asynchronous bundle
 * upload to Arweave when calling generator.next().
 * The Arweave Bundle Upload Generator automatically groups assets file pairs
 * into appropriately sized bundles.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
 */
function* makeArweaveBundleUploadGenerator(storage, dirname, assets, jwk, walletKeyPair) {
    let signer;
    const storageType = storage;
    if (storageType === storage_type_1.StorageType.ArweaveSol && !walletKeyPair) {
        throw new Error('To pay for uploads with SOL, you need to pass a Solana Keypair');
    }
    if (storageType === storage_type_1.StorageType.ArweaveBundle && !jwk) {
        throw new Error('To pay for uploads with AR, you need to pass a Arweave JWK');
    }
    if (storageType === storage_type_1.StorageType.ArweaveBundle) {
        signer = new arbundles_1.signers.ArweaveSigner(jwk);
    }
    const arweave = getArweave();
    const bundlr = storageType === storage_type_1.StorageType.ArweaveSol
        ? new client_1.default('https://node1.bundlr.network', 'solana', walletKeyPair.secretKey)
        : undefined;
    const filePairs = assets.map((asset) => ({
        key: asset.index,
        image: path_1.default.join(dirname, `${asset.index}${asset.mediaExt}`),
        manifest: path_1.default.join(dirname, `${asset.index}.json`),
    }));
    // Yield an empty result object before processing file pairs
    // & uploading bundles for initialization.
    yield Promise.resolve({
        cacheKeys: [],
        arweavePathManifestLinks: [],
        updatedManifests: [],
    });
    // As long as we still have file pairs needing upload, compute the next range
    // of file pairs we can include in the next bundle.
    while (filePairs.length) {
        const result = getBundleRange(filePairs, storage === storage_type_1.StorageType.ArweaveSol ? true : false).then(async function processBundle({ count, size }) {
            loglevel_1.default.info(`Computed Bundle range, including ${count} file pair(s) totaling ${sizeMB(size)}MB.`);
            const bundleFilePairs = filePairs.splice(0, count);
            const { cacheKeys, dataItems, arweavePathManifestLinks, updatedManifests, } = await bundleFilePairs.reduce(
            // Process a bundle file pair (image + manifest).
            // - retrieve image data, put it in a DataItem
            // - sign the image DataItem and build the image link from the txId.
            // - retrieve & update the asset manifest w/ the image link
            // - put the manifest in a DataItem
            // - sign the manifest DataItem and build the manifest link form the txId.
            // - create the Arweave Path Manifest w/ both asset image + manifest txIds pair.
            // - fill the results accumulator
            async function processBundleFilePair(accP, filePair) {
                const acc = await accP;
                loglevel_1.default.debug('Processing File Pair', filePair.key);
                const { imageDataItem, manifestDataItem, arweavePathManifestDataItem, manifest, } = await processFiles({ storageType, signer, bundlr, filePair });
                const arweavePathManifestLink = `https://arweave.net/${manifestDataItem.id}`;
                acc.cacheKeys.push(filePair.key);
                acc.dataItems.push(imageDataItem, manifestDataItem, arweavePathManifestDataItem);
                acc.arweavePathManifestLinks.push(arweavePathManifestLink);
                acc.updatedManifests.push(manifest);
                loglevel_1.default.debug('Processed File Pair', filePair.key);
                return acc;
            }, Promise.resolve({
                cacheKeys: [],
                dataItems: [],
                arweavePathManifestLinks: [],
                updatedManifests: [],
            }));
            if (storageType === storage_type_1.StorageType.ArweaveSol) {
                const bundlrTransactions = [...dataItems];
                loglevel_1.default.info('Uploading bundle via bundlr... in multiple transactions');
                const bytes = dataItems.reduce((c, d) => c + d.data.length, 0);
                const cost = await bundlr.utils.getPrice('solana', bytes);
                loglevel_1.default.info(`${cost.toNumber() / exports.LAMPORTS} SOL to upload`);
                await bundlr.fund(cost.toNumber());
                for (const tx of bundlrTransactions) {
                    let attempts = 0;
                    const uploadTransaction = async () => {
                        await tx.upload().catch(async (err) => {
                            attempts++;
                            if (attempts >= 3) {
                                throw err;
                            }
                            loglevel_1.default.warn(`Failed bundlr upload, automatically retrying transaction in 10s (attempt: ${attempts})`, err);
                            await (0, various_1.sleep)(10 * 1000);
                            await uploadTransaction();
                        });
                    };
                    await uploadTransaction();
                }
                loglevel_1.default.info('Bundle uploaded!');
            }
            if (storageType === storage_type_1.StorageType.ArweaveBundle) {
                const startBundleTime = Date.now();
                loglevel_1.default.info('Bundling...');
                const bundle = await (0, arbundles_1.bundleAndSignData)(dataItems, signer);
                const endBundleTime = Date.now();
                loglevel_1.default.info(`Bundled ${dataItems.length} data items in ${(endBundleTime - startBundleTime) / 1000}s`);
                // @ts-ignore
                // Argument of type
                // 'import("node_modules/arweave/node/common").default'
                // is not assignable to parameter of type
                // 'import("node_modules/arbundles/node_modules/arweave/node/common").default'.
                // Types of property 'api' are incompatible.
                const tx = await bundle.toTransaction(arweave, jwk);
                await arweave.transactions.sign(tx, jwk);
                loglevel_1.default.info('Uploading bundle via arbundle...');
                await arweave.transactions.post(tx);
                loglevel_1.default.info('Bundle uploaded!', tx.id);
            }
            return { cacheKeys, arweavePathManifestLinks, updatedManifests };
        });
        yield result;
    }
}
exports.makeArweaveBundleUploadGenerator = makeArweaveBundleUploadGenerator;
