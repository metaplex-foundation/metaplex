"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.uploadV2 = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const loglevel_1 = __importDefault(require("loglevel"));
const accounts_1 = require("../helpers/accounts");
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const anchor_1 = require("@project-serum/anchor");
const cache_1 = require("../helpers/cache");
const arweave_1 = require("../helpers/upload/arweave");
const arweave_bundle_1 = require("../helpers/upload/arweave-bundle");
const aws_1 = require("../helpers/upload/aws");
const ipfs_1 = require("../helpers/upload/ipfs");
const storage_type_1 = require("../helpers/storage-type");
const various_1 = require("../helpers/various");
async function uploadV2({ files, cacheName, env, totalNFTs, storage, retainAuthority, mutable, ipfsCredentials, awsS3Bucket, batchSize, price, treasuryWallet, splToken, gatekeeper, goLiveDate, endSettings, whitelistMintSettings, hiddenSettings, uuid, walletKeyPair, anchorProgram, arweaveJwk, }) {
    var _a, _b;
    let uploadSuccessful = true;
    const savedContent = (0, cache_1.loadCache)(cacheName, env);
    const cacheContent = savedContent || {};
    if (!cacheContent.program) {
        cacheContent.program = {};
    }
    if (!cacheContent.items) {
        cacheContent.items = {};
    }
    const dedupedAssetKeys = getAssetKeysNeedingUpload(cacheContent.items, files);
    const SIZE = dedupedAssetKeys.length;
    const dirname = path_1.default.dirname(files[0]);
    let candyMachine = cacheContent.program.candyMachine
        ? new web3_js_1.PublicKey(cacheContent.program.candyMachine)
        : undefined;
    if (!cacheContent.program.uuid) {
        const firstAssetKey = dedupedAssetKeys[0];
        const firstAssetManifest = getAssetManifest(dirname, firstAssetKey.index.includes('json')
            ? firstAssetKey.index
            : `${firstAssetKey.index}.json`);
        try {
            const remainingAccounts = [];
            if (splToken) {
                const splTokenKey = new web3_js_1.PublicKey(splToken);
                remainingAccounts.push({
                    pubkey: splTokenKey,
                    isWritable: false,
                    isSigner: false,
                });
            }
            if (!((_b = (_a = firstAssetManifest.properties) === null || _a === void 0 ? void 0 : _a.creators) === null || _b === void 0 ? void 0 : _b.every(creator => creator.address !== undefined))) {
                throw new Error('Creator address is missing');
            }
            // initialize candy
            loglevel_1.default.info(`initializing candy machine`);
            const res = await (0, accounts_1.createCandyMachineV2)(anchorProgram, walletKeyPair, treasuryWallet, splToken, {
                itemsAvailable: new anchor_1.BN(totalNFTs),
                uuid,
                symbol: firstAssetManifest.symbol,
                sellerFeeBasisPoints: firstAssetManifest.seller_fee_basis_points,
                isMutable: mutable,
                maxSupply: new anchor_1.BN(0),
                retainAuthority: retainAuthority,
                gatekeeper,
                goLiveDate,
                price,
                endSettings,
                whitelistMintSettings,
                hiddenSettings,
                creators: firstAssetManifest.properties.creators.map(creator => {
                    return {
                        address: new web3_js_1.PublicKey(creator.address),
                        verified: true,
                        share: creator.share,
                    };
                }),
            });
            cacheContent.program.uuid = res.uuid;
            cacheContent.program.candyMachine = res.candyMachine.toBase58();
            candyMachine = res.candyMachine;
            loglevel_1.default.info(`initialized config for a candy machine with publickey: ${res.candyMachine.toBase58()}`);
            (0, cache_1.saveCache)(cacheName, env, cacheContent);
        }
        catch (exx) {
            loglevel_1.default.error('Error deploying config to Solana network.', exx);
            throw exx;
        }
    }
    else {
        loglevel_1.default.info(`config for a candy machine with publickey: ${cacheContent.program.candyMachine} has been already initialized`);
    }
    console.log('Uploading Size', SIZE, dedupedAssetKeys[0]);
    if (dedupedAssetKeys.length) {
        if (storage === storage_type_1.StorageType.ArweaveBundle ||
            storage === storage_type_1.StorageType.ArweaveSol) {
            // Initialize the Arweave Bundle Upload Generator.
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
            const arweaveBundleUploadGenerator = (0, arweave_bundle_1.makeArweaveBundleUploadGenerator)(storage, dirname, dedupedAssetKeys, storage === storage_type_1.StorageType.ArweaveBundle
                ? JSON.parse((await (0, promises_1.readFile)(arweaveJwk)).toString())
                : undefined, storage === storage_type_1.StorageType.ArweaveSol ? walletKeyPair : undefined);
            let result = arweaveBundleUploadGenerator.next();
            // Loop over every uploaded bundle of asset filepairs (PNG + JSON)
            // and save the results to the Cache object, persist it to the Cache file.
            while (!result.done) {
                const { cacheKeys, arweavePathManifestLinks, updatedManifests } = await result.value;
                updateCacheAfterUpload(cacheContent, cacheKeys, arweavePathManifestLinks, updatedManifests);
                (0, cache_1.saveCache)(cacheName, env, cacheContent);
                loglevel_1.default.info('Saved bundle upload result to cache.');
                result = arweaveBundleUploadGenerator.next();
            }
            loglevel_1.default.info('Upload done.');
        }
        else {
            let lastPrinted = 0;
            const tick = SIZE / 100; //print every one percent
            await Promise.all((0, various_1.chunks)(Array.from(Array(SIZE).keys()), batchSize || 50).map(async (allIndexesInSlice) => {
                for (let i = 0; i < allIndexesInSlice.length; i++) {
                    const assetKey = dedupedAssetKeys[allIndexesInSlice[i]];
                    const image = path_1.default.join(dirname, `${assetKey.index}${assetKey.mediaExt}`);
                    const manifest = getAssetManifest(dirname, assetKey.index.includes('json')
                        ? assetKey.index
                        : `${assetKey.index}.json`);
                    const manifestBuffer = Buffer.from(JSON.stringify(manifest));
                    if (allIndexesInSlice[i] >= lastPrinted + tick ||
                        allIndexesInSlice[i] === 0) {
                        lastPrinted = allIndexesInSlice[i];
                        loglevel_1.default.info(`Processing asset: ${allIndexesInSlice[i]}`);
                    }
                    let link, imageLink;
                    try {
                        switch (storage) {
                            case storage_type_1.StorageType.Ipfs:
                                [link, imageLink] = await (0, ipfs_1.ipfsUpload)(ipfsCredentials, image, manifestBuffer);
                                break;
                            case storage_type_1.StorageType.Aws:
                                [link, imageLink] = await (0, aws_1.awsUpload)(awsS3Bucket, image, manifestBuffer);
                                break;
                            case storage_type_1.StorageType.Arweave:
                            default:
                                [link, imageLink] = await (0, arweave_1.arweaveUpload)(walletKeyPair, anchorProgram, env, image, manifestBuffer, manifest, assetKey.index);
                        }
                        if (link && imageLink) {
                            loglevel_1.default.debug('Updating cache for ', allIndexesInSlice[i]);
                            cacheContent.items[assetKey.index] = {
                                link,
                                name: manifest.name,
                                onChain: false,
                            };
                            (0, cache_1.saveCache)(cacheName, env, cacheContent);
                        }
                    }
                    catch (err) {
                        loglevel_1.default.error(`Error uploading file ${assetKey}`, err);
                        i--;
                    }
                }
            }));
        }
        (0, cache_1.saveCache)(cacheName, env, cacheContent);
    }
    const keys = Object.keys(cacheContent.items);
    if (!hiddenSettings) {
        try {
            await Promise.all((0, various_1.chunks)(Array.from(Array(keys.length).keys()), 1000).map(async (allIndexesInSlice) => {
                for (let offset = 0; offset < allIndexesInSlice.length; offset += 10) {
                    const indexes = allIndexesInSlice.slice(offset, offset + 10);
                    const onChain = indexes.filter(i => {
                        var _a;
                        const index = keys[i];
                        return ((_a = cacheContent.items[index]) === null || _a === void 0 ? void 0 : _a.onChain) || false;
                    });
                    const ind = keys[indexes[0]];
                    if (onChain.length != indexes.length) {
                        loglevel_1.default.info(`Writing indices ${ind}-${keys[indexes[indexes.length - 1]]}`);
                        try {
                            await anchorProgram.rpc.addConfigLines(ind, indexes.map(i => ({
                                uri: cacheContent.items[keys[i]].link,
                                name: cacheContent.items[keys[i]].name,
                            })), {
                                accounts: {
                                    candyMachine,
                                    authority: walletKeyPair.publicKey,
                                },
                                signers: [walletKeyPair],
                            });
                            indexes.forEach(i => {
                                cacheContent.items[keys[i]] = {
                                    ...cacheContent.items[keys[i]],
                                    onChain: true,
                                    verifyRun: false,
                                };
                            });
                            (0, cache_1.saveCache)(cacheName, env, cacheContent);
                        }
                        catch (e) {
                            loglevel_1.default.error(`saving config line ${ind}-${keys[indexes[indexes.length - 1]]} failed`, e);
                            uploadSuccessful = false;
                        }
                    }
                }
            }));
        }
        catch (e) {
            loglevel_1.default.error(e);
        }
        finally {
            (0, cache_1.saveCache)(cacheName, env, cacheContent);
        }
    }
    else {
        loglevel_1.default.info('Skipping upload to chain as this is a hidden Candy Machine');
    }
    console.log(`Done. Successful = ${uploadSuccessful}.`);
    return uploadSuccessful;
}
exports.uploadV2 = uploadV2;
/**
 * From the Cache object & a list of file paths, return a list of asset keys
 * (filenames without extension nor path) that should be uploaded, sorted numerically in ascending order.
 * Assets which should be uploaded either are not present in the Cache object,
 * or do not truthy value for the `link` property.
 */
function getAssetKeysNeedingUpload(items, files) {
    const all = [
        ...new Set([
            ...Object.keys(items),
            ...files.map(filePath => path_1.default.basename(filePath)),
        ]),
    ];
    const keyMap = {};
    return all
        .filter(k => !k.includes('.json'))
        .reduce((acc, assetKey) => {
        var _a;
        const ext = path_1.default.extname(assetKey);
        const key = path_1.default.basename(assetKey, ext);
        if (!((_a = items[key]) === null || _a === void 0 ? void 0 : _a.link) && !keyMap[key]) {
            keyMap[key] = true;
            acc.push({ mediaExt: ext, index: key });
        }
        return acc;
    }, [])
        .sort((a, b) => Number.parseInt(a.key, 10) - Number.parseInt(b.key, 10));
}
/**
 * Returns a Manifest from a path and an assetKey
 * Replaces image.ext => index.ext
 */
function getAssetManifest(dirname, assetKey) {
    var _a, _b, _c, _d;
    const assetIndex = assetKey.includes('.json')
        ? assetKey.substring(0, assetKey.length - 5)
        : assetKey;
    const manifestPath = path_1.default.join(dirname, `${assetIndex}.json`);
    const manifest = JSON.parse(fs_1.default.readFileSync(manifestPath).toString());
    manifest.image = manifest.image.replace('image', assetIndex);
    if (((_b = (_a = manifest.properties) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b.length) > 0) {
        manifest.properties.files[0].uri =
            (_d = (_c = manifest.properties.files[0]) === null || _c === void 0 ? void 0 : _c.uri) === null || _d === void 0 ? void 0 : _d.replace('image', assetIndex);
    }
    return manifest;
}
/**
 * For each asset present in the Cache object, write to the deployed
 * configuration an additional line with the name of the asset and the link
 * to its manifest, if the asset was not already written according to the
 * value of `onChain` property in the Cache object, for said asset.
 */
async function writeIndices({ anchorProgram, cache, cacheName, env, config, walletKeyPair, }) {
    const keys = Object.keys(cache.items);
    try {
        await Promise.all((0, various_1.chunks)(Array.from(Array(keys.length).keys()), 1000).map(async (allIndexesInSlice) => {
            for (let offset = 0; offset < allIndexesInSlice.length; offset += 10) {
                const indexes = allIndexesInSlice.slice(offset, offset + 10);
                const onChain = indexes.filter(i => {
                    var _a;
                    const index = keys[i];
                    return ((_a = cache.items[index]) === null || _a === void 0 ? void 0 : _a.onChain) || false;
                });
                const ind = keys[indexes[0]];
                if (onChain.length != indexes.length) {
                    loglevel_1.default.info(`Writing indices ${ind}-${keys[indexes[indexes.length - 1]]}`);
                    try {
                        await anchorProgram.rpc.addConfigLines(ind, indexes.map(i => ({
                            uri: cache.items[keys[i]].link,
                            name: cache.items[keys[i]].name,
                        })), {
                            accounts: {
                                config,
                                authority: walletKeyPair.publicKey,
                            },
                            signers: [walletKeyPair],
                        });
                        indexes.forEach(i => {
                            cache.items[keys[i]] = {
                                ...cache.items[keys[i]],
                                onChain: true,
                            };
                        });
                        (0, cache_1.saveCache)(cacheName, env, cache);
                    }
                    catch (err) {
                        loglevel_1.default.error(`Saving config line ${ind}-${keys[indexes[indexes.length - 1]]} failed`, err);
                    }
                }
            }
        }));
    }
    catch (e) {
        loglevel_1.default.error(e);
    }
    finally {
        (0, cache_1.saveCache)(cacheName, env, cache);
    }
}
/**
 * Save the Candy Machine's authority (public key) to the Cache object / file.
 */
function setAuthority(publicKey, cache, cacheName, env) {
    cache.authority = publicKey.toBase58();
    (0, cache_1.saveCache)(cacheName, env, cache);
}
/**
 * Update the Cache object for assets that were uploaded with their matching
 * Manifest link. Also set the `onChain` property to `false` so we know this
 * asset should later be appended to the deployed Candy Machine program's
 * configuration on chain.
 */
function updateCacheAfterUpload(cache, cacheKeys, links, manifests) {
    cacheKeys.forEach((cacheKey, idx) => {
        cache.items[cacheKey] = {
            link: links[idx],
            name: manifests[idx].name,
            onChain: false,
        };
    });
}
async function upload({ files, cacheName, env, keypair, storage, rpcUrl, ipfsCredentials, awsS3Bucket, arweaveJwk, batchSize, }) {
    var _a;
    // Read the content of the Cache file into the Cache object, initialize it
    // otherwise.
    const cache = (0, cache_1.loadCache)(cacheName, env);
    if (cache === undefined) {
        loglevel_1.default.error('Existing cache not found. To create a new candy machine, please use candy machine v2.');
        throw new Error('Existing cache not found');
    }
    // Make sure config exists in cache
    if (!((_a = cache.program) === null || _a === void 0 ? void 0 : _a.config)) {
        loglevel_1.default.error('existing config account not found in cache. To create a new candy machine, please use candy machine v2.');
        throw new Error('config account not found in cache');
    }
    const config = new web3_js_1.PublicKey(cache.program.config);
    cache.items = cache.items || {};
    // Retrieve the directory path where the assets are located.
    const dirname = path_1.default.dirname(files[0]);
    // Compile a sorted list of assets which need to be uploaded.
    const dedupedAssetKeys = getAssetKeysNeedingUpload(cache.items, files);
    // Initialize variables that might be needed for uploded depending on storage
    // type.
    // These will be needed anyway either to initialize the
    // Candy Machine Custom Program configuration, or to write the assets
    // to the deployed configuration on chain.
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
    // Some assets need to be uploaded.
    if (dedupedAssetKeys.length) {
        // Arweave Native storage leverages Arweave Bundles.
        // It allows to ncapsulate multiple independent data transactions
        // into a single top level transaction,
        // which pays the reward for all bundled data.
        // https://github.com/Bundlr-Network/arbundles
        // Each bundle consists of one or multiple asset filepair (PNG + JSON).
        if (storage === storage_type_1.StorageType.ArweaveBundle ||
            storage === storage_type_1.StorageType.ArweaveSol) {
            // Initialize the Arweave Bundle Upload Generator.
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
            const arweaveBundleUploadGenerator = (0, arweave_bundle_1.makeArweaveBundleUploadGenerator)(storage, dirname, dedupedAssetKeys, storage === storage_type_1.StorageType.ArweaveBundle
                ? JSON.parse((await (0, promises_1.readFile)(arweaveJwk)).toString())
                : undefined, storage === storage_type_1.StorageType.ArweaveSol ? walletKeyPair : undefined);
            let result = arweaveBundleUploadGenerator.next();
            // Loop over every uploaded bundle of asset filepairs (PNG + JSON)
            // and save the results to the Cache object, persist it to the Cache file.
            while (!result.done) {
                const { cacheKeys, arweavePathManifestLinks, updatedManifests } = await result.value;
                updateCacheAfterUpload(cache, cacheKeys, arweavePathManifestLinks, updatedManifests);
                (0, cache_1.saveCache)(cacheName, env, cache);
                loglevel_1.default.info('Saved bundle upload result to cache.');
                result = arweaveBundleUploadGenerator.next();
            }
            loglevel_1.default.info('Upload done.');
        }
        else {
            // For other storage methods, we upload the files individually.
            const SIZE = dedupedAssetKeys.length;
            const tick = SIZE / 100; // print every one percent
            let lastPrinted = 0;
            await Promise.all((0, various_1.chunks)(Array.from(Array(SIZE).keys()), batchSize || 50).map(async (allIndexesInSlice) => {
                for (let i = 0; i < allIndexesInSlice.length; i++) {
                    const assetKey = dedupedAssetKeys[i];
                    const image = path_1.default.join(dirname, `${assetKey.index}${assetKey.mediaExt}`);
                    const manifest = getAssetManifest(dirname, assetKey.index.includes('json')
                        ? assetKey.index
                        : `${assetKey.index}.json`);
                    const manifestBuffer = Buffer.from(JSON.stringify(manifest));
                    if (i >= lastPrinted + tick || i === 0) {
                        lastPrinted = i;
                        loglevel_1.default.info(`Processing asset: ${assetKey}`);
                    }
                    let link, imageLink;
                    try {
                        switch (storage) {
                            case storage_type_1.StorageType.Ipfs:
                                [link, imageLink] = await (0, ipfs_1.ipfsUpload)(ipfsCredentials, image, manifestBuffer);
                                break;
                            case storage_type_1.StorageType.Aws:
                                [link, imageLink] = await (0, aws_1.awsUpload)(awsS3Bucket, image, manifestBuffer);
                                break;
                            case storage_type_1.StorageType.Arweave:
                            default:
                                [link, imageLink] = await (0, arweave_1.arweaveUpload)(walletKeyPair, anchorProgram, env, image, manifestBuffer, manifest, i);
                        }
                        if (link && imageLink) {
                            loglevel_1.default.debug('Updating cache for ', assetKey);
                            cache.items[assetKey.index] = {
                                link,
                                imageLink,
                                name: manifest.name,
                                onChain: false,
                            };
                            (0, cache_1.saveCache)(cacheName, env, cache);
                        }
                    }
                    catch (err) {
                        loglevel_1.default.error(`Error uploading file ${assetKey}`, err);
                        throw err;
                    }
                }
            }));
        }
        setAuthority(walletKeyPair.publicKey, cache, cacheName, env);
        return writeIndices({
            anchorProgram,
            cache,
            cacheName,
            env,
            config,
            walletKeyPair,
        });
    }
}
exports.upload = upload;
