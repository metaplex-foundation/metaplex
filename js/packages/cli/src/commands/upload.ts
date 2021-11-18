import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

import { PublicKey } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';

import log from 'loglevel';

import {
  createConfig,
  loadCandyProgram,
  loadWalletKey,
} from '../helpers/accounts';
import { loadCache, saveCache } from '../helpers/cache';
import { EXTENSION_PNG } from '../helpers/constants';
import { arweaveUpload } from '../helpers/upload/arweave';
import { makeArweaveBundleUploadGenerator } from '../helpers/upload/arweave-bundle';
import { awsUpload } from '../helpers/upload/aws';
import { ipfsCreds, ipfsUpload } from '../helpers/upload/ipfs';
import { StorageType } from '../helpers/storage-type';
import { chunks } from '../helpers/various';

/**
 * The Cache object, represented in its minimal form.
 */
type Cache = {
  program: {
    config?: string;
  };
  items: {
    [key: string]: any;
  };
};

/**
 * The Manifest object for a given asset.
 * This object holds the contents of the asset's JSON file.
 * Represented here in its minimal form.
 */
type Manifest = {
  image: string;
  name: string;
  symbol: string;
  seller_fee_basis_points: number;
  properties: {
    files: Array<{ type: string; uri: string }>;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
};

/**
 * From the Cache object & a list of file paths, return a list of asset keys
 * (filenames without extension nor path) that should be uploaded, sorted numerically in ascending order.
 * Assets which should be uploaded either are not present in the Cache object,
 * or do not truthy value for the `link` property.
 */
function getAssetKeysNeedingUpload(
  items: Cache['items'],
  files: string[],
): string[] {
  const all = [
    ...new Set([
      ...Object.keys(items),
      ...files.map(filePath => path.basename(filePath, path.extname(filePath))),
    ]),
  ];

  return all
    .reduce((acc, assetKey) => {
      if (!items[assetKey]?.link) {
        acc.push(assetKey);
      }

      return acc;
    }, [])
    .sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
}

/**
 * From the Cache object & a list of file paths, return a list of asset keys
 * (filenames without extension nor path) that should be uploaded.
 * Assets which should be uploaded either are not present in the Cache object,
 * or do not truthy value for the `link` property.
 */
function getAssetManifest(dirname: string, assetKey: string): Manifest {
  const manifestPath = path.join(dirname, `${assetKey}.json`);
  return JSON.parse(fs.readFileSync(manifestPath).toString());
}

/**
 * Initialize & deploy the Candy Machine Custom Program's configuration,
 * then save a reference to this config in the Cache object.
 */
async function initConfig(
  anchorProgram,
  walletKeyPair,
  {
    totalNFTs,
    mutable,
    symbol,
    retainAuthority,
    sellerFeeBasisPoints,
    creators,
    env,
    cache,
    cacheName,
  },
) {
  log.info('Initializing program config');
  try {
    const res = await createConfig(anchorProgram, walletKeyPair, {
      maxNumberOfLines: new BN(totalNFTs),
      symbol,
      sellerFeeBasisPoints,
      isMutable: mutable,
      maxSupply: new BN(0),
      retainAuthority: retainAuthority,
      creators: creators.map(creator => ({
        address: new PublicKey(creator.address),
        verified: true,
        share: creator.share,
      })),
    });
    cache.program.uuid = res.uuid;
    cache.program.config = res.config.toBase58();
    const config = res.config;

    log.info(
      `Initialized config for a candy machine with publickey: ${config.toBase58()}`,
    );

    saveCache(cacheName, env, cache);
    return config;
  } catch (err) {
    log.error('Error deploying config to Solana network.', err);
    throw err;
  }
}

/**
 * For each asset present in the Cache object, write to the deployed
 * configuration an additional line with the name of the asset and the link
 * to its manifest, if the asset was not already written according to the
 * value of `onChain` property in the Cache object, for said asset.
 */
async function writeIndices({
  anchorProgram,
  cache,
  cacheName,
  env,
  config,
  walletKeyPair,
}) {
  const keys = Object.keys(cache.items);
  try {
    await Promise.all(
      chunks(Array.from(Array(keys.length).keys()), 1000).map(
        async allIndexesInSlice => {
          for (
            let offset = 0;
            offset < allIndexesInSlice.length;
            offset += 10
          ) {
            const indexes = allIndexesInSlice.slice(offset, offset + 10);
            const onChain = indexes.filter(i => {
              const index = keys[i];
              return cache.items[index]?.onChain || false;
            });
            const ind = keys[indexes[0]];

            if (onChain.length != indexes.length) {
              log.info(
                `Writing indices ${ind}-${keys[indexes[indexes.length - 1]]}`,
              );
              try {
                await anchorProgram.rpc.addConfigLines(
                  ind,
                  indexes.map(i => ({
                    uri: cache.items[keys[i]].link,
                    name: cache.items[keys[i]].name,
                  })),
                  {
                    accounts: {
                      config,
                      authority: walletKeyPair.publicKey,
                    },
                    signers: [walletKeyPair],
                  },
                );
                indexes.forEach(i => {
                  cache.items[keys[i]] = {
                    ...cache.items[keys[i]],
                    onChain: true,
                  };
                });
                saveCache(cacheName, env, cache);
              } catch (err) {
                log.error(
                  `Saving config line ${ind}-${
                    keys[indexes[indexes.length - 1]]
                  } failed`,
                  err,
                );
              }
            }
          }
        },
      ),
    );
  } catch (e) {
    log.error(e);
  } finally {
    saveCache(cacheName, env, cache);
  }
}

/**
 * Save the Candy Machine's authority (public key) to the Cache object / file.
 */
function setAuthority(publicKey, cache, cacheName, env) {
  cache.authority = publicKey.toBase58();
  saveCache(cacheName, env, cache);
}

/**
 * Update the Cache object for assets that were uploaded with their matching
 * Manifest link. Also set the `onChain` property to `false` so we know this
 * asset should later be appended to the deployed Candy Machine program's
 * configuration on chain.
 */
function updateCacheAfterUpload(
  cache: Cache,
  cacheKeys: Array<keyof Cache['items']>,
  links: string[],
  manifests: Manifest[],
) {
  cacheKeys.forEach((cacheKey, idx) => {
    cache.items[cacheKey] = {
      link: links[idx],
      name: manifests[idx].name,
      onChain: false,
    };
  });
}

type UploadParams = {
  files: string[];
  cacheName: string;
  env: string;
  keypair: string;
  totalNFTs: number;
  storage: string;
  retainAuthority: boolean;
  mutable: boolean;
  rpcUrl: string;
  ipfsCredentials: ipfsCreds;
  awsS3Bucket: string;
  arweaveJwk: string;
};
export async function upload({
  files,
  cacheName,
  env,
  keypair,
  totalNFTs,
  storage,
  retainAuthority,
  mutable,
  rpcUrl,
  ipfsCredentials,
  awsS3Bucket,
  arweaveJwk,
}: UploadParams): Promise<void> {
  // Read the content of the Cache file into the Cache object, initialize it
  // otherwise.
  const cache: Cache = loadCache(cacheName, env) || {
    program: {},
    items: {},
  };

  // Normalize the Cache object in case the Cache file was incomplete.
  cache.program = cache.program || {};
  cache.items = cache.items || {};

  // Retrieve the directory path where the assets are located.
  const dirname = path.dirname(files[0]);
  // Compile a sorted list of assets which need to be uploaded.
  const dedupedAssetKeys = getAssetKeysNeedingUpload(cache.items, files);

  // Initialize variables that might be needed for uploded depending on storage
  // type.
  // These will be needed anyway either to initialize the
  // Candy Machine Custom Program configuration, or to write the assets
  // to the deployed configuration on chain.
  let walletKeyPair;
  let anchorProgram;

  // Some assets need to be uploaded.
  if (dedupedAssetKeys.length) {
    // Arweave Native storage leverages Arweave Bundles.
    // It allows to ncapsulate multiple independent data transactions
    // into a single top level transaction,
    // which pays the reward for all bundled data.
    // https://github.com/Bundlr-Network/arbundles
    // Each bundle consists of one or multiple asset filepair (PNG + JSON).
    if (storage === StorageType.ArweaveBundle) {
      // Initialize the Arweave Bundle Upload Generator.
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
      const arweaveBundleUploadGenerator = makeArweaveBundleUploadGenerator(
        dirname,
        dedupedAssetKeys,
        JSON.parse((await readFile(arweaveJwk)).toString()),
      );

      let result = arweaveBundleUploadGenerator.next();
      // Loop over every uploaded bundle of asset filepairs (PNG + JSON)
      // and save the results to the Cache object, persist it to the Cache file.
      while (!result.done) {
        const { cacheKeys, arweavePathManifestLinks, updatedManifests } =
          await result.value;
        updateCacheAfterUpload(
          cache,
          cacheKeys,
          arweavePathManifestLinks,
          updatedManifests,
        );
        saveCache(cacheName, env, cache);
        log.info('Saved bundle upload result to cache.');
        result = arweaveBundleUploadGenerator.next();
      }
      log.info('Upload done.');
    } else {
      // For other storage methods, we upload the files individually.
      for (let i = 0; i < dedupedAssetKeys.length; i++) {
        const assetKey = dedupedAssetKeys[i];
        const image = path.join(dirname, `${assetKey}${EXTENSION_PNG}`);
        const manifest = getAssetManifest(dirname, assetKey);
        const manifestBuffer = Buffer.from(JSON.stringify(manifest));

        log.debug(`Processing asset: ${assetKey}`);

        let link, imageLink;
        try {
          switch (storage) {
            case StorageType.Ipfs:
              [link, imageLink] = await ipfsUpload(
                ipfsCredentials,
                image,
                manifestBuffer,
              );
              break;
            case StorageType.Aws:
              [link, imageLink] = await awsUpload(
                awsS3Bucket,
                image,
                manifestBuffer,
              );
              break;
            case StorageType.Arweave:
            default:
              walletKeyPair = loadWalletKey(keypair);
              anchorProgram = await loadCandyProgram(
                walletKeyPair,
                env,
                rpcUrl,
              );
              [link, imageLink] = await arweaveUpload(
                walletKeyPair,
                anchorProgram,
                env,
                image,
                manifestBuffer,
                manifest,
                i,
              );
          }
          if (link && imageLink) {
            log.debug('Updating cache for ', assetKey);
            cache.items[assetKey] = {
              link,
              imageLink,
              name: manifest.name,
              onChain: false,
            };
            saveCache(cacheName, env, cache);
          }
        } catch (err) {
          log.error(`Error uploading file ${assetKey}`, err);
          throw err;
        }
      }
    }
  }

  const {
    properties: { creators },
    seller_fee_basis_points: sellerFeeBasisPoints,
    symbol,
  } = getAssetManifest(dirname, '0');

  walletKeyPair = loadWalletKey(keypair);
  anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

  const config = cache.program.config
    ? new PublicKey(cache.program.config)
    : await initConfig(anchorProgram, walletKeyPair, {
        totalNFTs,
        mutable,
        retainAuthority,
        sellerFeeBasisPoints,
        symbol,
        creators,
        env,
        cache,
        cacheName,
      });

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
