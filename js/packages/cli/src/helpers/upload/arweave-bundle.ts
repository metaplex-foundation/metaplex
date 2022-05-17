import * as cliProgress from 'cli-progress';
import { readFile, stat } from 'fs/promises';
import { PromisePool } from '@supercharge/promise-pool';
import path from 'path';
import Arweave from 'arweave';

import { signers, bundleAndSignData, createData, DataItem } from 'arbundles';
import { ArweaveSigner, Signer } from 'arbundles/src/signing';
import log from 'loglevel';
import { StorageType } from '../storage-type';
import { Keypair } from '@solana/web3.js';
import { getType, getExtension } from 'mime';
import { AssetKey } from '../../types';
import { sleep } from '../various';
import Transaction from 'arweave/node/lib/transaction';
import Bundlr from '@bundlr-network/client';

import { getAssetManifest } from '../../commands/upload';
import BundlrTransaction from '@bundlr-network/client/build/common/transaction';

export const LAMPORTS = 1_000_000_000;
/**
 * The Arweave Path Manifest object for a given asset file pair.
 * https://github.com/ArweaveTeam/arweave/blob/master/doc/path-manifest-schema.md
 */
type ArweavePathManifest = {
  manifest: 'arweave/paths';
  version: '0.1.0';
  paths: {
    [key: string]: {
      id: string; // arweave transaction id
    };
    'metadata.json': {
      id: string; // arweave transaction id
    };
  };
  index: {
    path: 'metadata.json';
  };
};

/**
 * The arguments required for processing the file pair
 * signer - The Arweave JWK (if storage is arweave-bundle)
 * storageType - The Storage Type for differentiating between Bundlr and Arbundle
 * bundlr - The Bundlr instance
 * filePair - The current file pair
 */
type ProcessFileArgs = {
  signer: ArweaveSigner;
  storageType: StorageType;
  bundlr: Bundlr;
  filePair: {
    key: string;
    image: string;
    animation: string;
    manifest: string;
  };
};

/**
 * The Manifest object for a given asset.
 * This object holds the contents of the asset's JSON file.
 * Represented here in its minimal form.
 */
type Manifest = {
  name: string;
  image: string;
  animation_url: string;
  properties: {
    files: Array<{ type: string; uri: string }>;
  };
};

/**
 * The result of the processing of a set of assets file pairs, to be bundled
 * before upload.
 */
type ProcessedBundleFilePairs = {
  cacheKeys: string[];
  dataItems: DataItem[];
  arweavePathManifestLinks: string[];
  updatedManifests: Manifest[];
};

/**
 * The result of the upload of a bundle, identical to ProcessedBundleFilePairs
 * without the `dataItems` property, which holds the binary data.
 */
type UploadGeneratorResult = Omit<ProcessedBundleFilePairs, 'dataItems'>;

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
function getArweave(): Arweave {
  return new Arweave({
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
function sizeMB(bytes: number): string {
  const precision = 3;
  const rounder = Math.pow(10, 3);
  return (Math.round((bytes / (1024 * 1024)) * rounder) / rounder).toFixed(
    precision,
  );
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
function createArweavePathManifest(
  manifestTxId: string,
  imageTxId: string,
  imageType: string,
  animationTxId: string,
  animationType: string,
): ArweavePathManifest {
  const arweavePathManifest: ArweavePathManifest = {
    manifest: 'arweave/paths',
    version: '0.1.0',
    paths: {
      [`image${imageType}`]: {
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
  if (animationTxId) {
    arweavePathManifest.paths[`animation${animationType}`] = {
      id: animationTxId,
    };
  }
  return arweavePathManifest;
}

// The size in bytes of a dummy Arweave Path Manifest.
// Used to account for the size of a file pair manifest, in the computation
// of a bundle range.
const dummyAreaveManifestByteSize = (() => {
  const dummyAreaveManifest = createArweavePathManifest(
    'akBSbAEWTf6xDDnrG_BHKaxXjxoGuBnuhMnoYKUCDZo',
    'akBSbAEWTf6xDDnrG_BHKaxXjxoGuBnuhMnoYKUCDZo',
    '.png',
    'akBSbAEWTf6xDDnrG_BHKaxXjxoGuBnuhMnoYKUCDZo',
    '.mp4',
  );
  return Buffer.byteLength(JSON.stringify(dummyAreaveManifest));
})();

/**
 * An asset file pair, consists of the following properties:
 * - key:       the asset filename & Cache objet key, without file extension.
 * - image:     the asset's image (PNG) full path.
 * - manifest:  the asset's manifest (JSON) full path.
 * Example:
 * For a given file pair :
 * - key:       '0'
 * - image:     '/assets/0.png'
 * - manifest:  '/assets/0.json'
 */
type FilePair = {
  key: string;
  image: string;
  animation: string;
  manifest: string;
};

async function getFilePairSize({
  image,
  animation,
  manifest,
}: FilePair): Promise<number> {
  return await [image, animation, manifest].reduce(async (accP, file) => {
    const acc = await accP;
    if (!file) {
      return acc;
    } else {
      const { size } = await stat(file);
      //Adds the 2kb buffer for the txn header and the 10kb min file upload size for bundlr
      return acc + 2000 + Math.max(10000, size);
    }
  }, Promise.resolve(dummyAreaveManifestByteSize));
}

/**
 * Object used to extract the file pairs to be included in the next bundle, from
 * the current list of filePairs being processed.
 * - the number of file pairs to be included in the next bundle.
 * - the total size in bytes of assets to be included in said bundle.
 */
type BundleRange = {
  count: number;
  size: number;
};

/**
 * From a list of file pairs, compute the BundleRange that should be included
 * in a bundle, consisting of one or multiple image + manifest pairs,
 * according to the size of the files to be included in respect of the
 * BUNDLE_SIZE_LIMIT.
 */
async function getBundleRange(
  filePairs: FilePair[],
  splitSize: boolean = false,
): Promise<BundleRange> {
  let total = 0;
  let count = 0;
  for (const filePair of filePairs) {
    const filePairSize = await getFilePairSize(filePair);

    const limit = splitSize
      ? BUNDLE_SIZE_BYTE_LIMIT * 2
      : BUNDLE_SIZE_BYTE_LIMIT;
    if (total + filePairSize >= limit) {
      if (count === 0) {
        throw new Error(
          `Image + Manifest filepair (${filePair.key}) too big (${sizeMB(
            filePairSize,
          )}MB) for arBundles size limit of ${sizeMB(
            BUNDLE_SIZE_BYTE_LIMIT,
          )}MB.`,
        );
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
async function getImageDataItem(
  signer: Signer,
  image: Buffer,
  contentType: string,
): Promise<DataItem> {
  return createData(image, signer, {
    tags: imageTags.concat({ name: 'Content-Type', value: contentType }),
  });
}

const manifestTags = [...BASE_TAGS, contentTypeTags['json']];
/**
 * Retrieve a DataItem which will hold the asset's manifest binary data
 * & represent an individual Arweave transaction which can be signed & bundled.
 */
function getManifestDataItem(signer: Signer, manifest: Manifest): DataItem {
  return createData(JSON.stringify(manifest), signer, { tags: manifestTags });
}

const arweavePathManifestTags = [
  ...BASE_TAGS,
  contentTypeTags['arweave-manifest'],
];
/**
 * Retrieve a DataItem which will hold the Arweave Path Manifest binary data
 * & represent an individual Arweave transaction which can be signed & bundled.
 */
function getArweavePathManifestDataItem(
  signer: Signer,
  arweavePathManifest: ArweavePathManifest,
): DataItem {
  return createData(JSON.stringify(arweavePathManifest), signer, {
    tags: arweavePathManifestTags,
  });
}

/**
 * Retrieve an asset's manifest from the filesystem & update it with the link
 * to the asset's image/animation link, obtained from signing the asset image/animation DataItem.
 */
async function getUpdatedManifest(
  manifestPath: string,
  imageLink: string,
  animationLink: string,
): Promise<Manifest> {
  const manifest: Manifest = JSON.parse(
    (await readFile(manifestPath)).toString(),
  );
  const originalImage = manifest.image;
  manifest.image = imageLink;
  manifest.properties.files.forEach(file => {
    if (file.uri === originalImage) file.uri = imageLink;
  });
  if (animationLink) {
    manifest.animation_url = animationLink;
  }
  return manifest;
}

/**
 * Fetches the corresponding filepair and creates a data item if arweave bundle
 * or creates a bundlr transaction if arweave sol, to basically avoid clashing
 * between data item's id
 */
async function processFiles({
  signer,
  filePair,
  bundlr,
  storageType,
}: ProcessFileArgs) {
  let imageDataItem: BundlrTransaction | DataItem;
  let animationDataItem: BundlrTransaction | DataItem;
  let manifestDataItem: BundlrTransaction | DataItem;
  let arweavePathManifestDataItem: BundlrTransaction | DataItem;

  const imageContentType = getType(filePair.image);
  const imageBuffer = await readFile(filePair.image);
  if (storageType === StorageType.ArweaveSol) {
    //@ts-ignore
    imageDataItem = bundlr.createTransaction(imageBuffer, {
      tags: imageTags.concat({
        name: 'Content-Type',
        value: imageContentType,
      }),
    });
    await (imageDataItem as unknown as BundlrTransaction).sign();
  } else if (storageType === StorageType.ArweaveBundle) {
    imageDataItem = await getImageDataItem(
      signer,
      imageBuffer,
      imageContentType,
    );
    await (imageDataItem as DataItem).sign(signer);
  }

  let animationContentType = undefined;
  if (filePair.animation) {
    animationContentType = getType(filePair.animation);
    const animationBuffer = await readFile(filePair.animation);
    if (storageType === StorageType.ArweaveSol) {
      //@ts-ignore
      animationDataItem = bundlr.createTransaction(animationBuffer, {
        tags: imageTags.concat({
          name: 'Content-Type',
          value: animationContentType,
        }),
      });
      await (animationDataItem as unknown as BundlrTransaction).sign();
    } else if (storageType === StorageType.ArweaveBundle) {
      animationDataItem = await getImageDataItem(
        signer,
        animationBuffer,
        animationContentType,
      );
      await (animationDataItem as DataItem).sign(signer);
    }
  }

  const imageLink = `https://arweave.net/${imageDataItem.id}?ext=${path
    .extname(filePair.image)
    .replace('.', '')}`;
  const animationLink = filePair.animation
    ? `https://arweave.net/${animationDataItem.id}?ext=${path
        .extname(filePair.animation)
        .replace('.', '')}`
    : undefined;

  const manifest = await getUpdatedManifest(
    filePair.manifest,
    imageLink,
    animationLink,
  );

  if (storageType === StorageType.ArweaveSol) {
    //@ts-ignore
    manifestDataItem = bundlr.createTransaction(JSON.stringify(manifest), {
      tags: manifestTags,
    });

    await (manifestDataItem as unknown as BundlrTransaction).sign();
  } else if (storageType === StorageType.ArweaveBundle) {
    manifestDataItem = getManifestDataItem(signer, manifest);
    await (manifestDataItem as DataItem).sign(signer);
  }

  const arweavePathManifest = createArweavePathManifest(
    manifestDataItem.id,
    imageDataItem.id,
    `.${getExtension(imageContentType)}`,
    filePair.animation ? animationDataItem.id : undefined,
    filePair.animation ? `.${getExtension(animationContentType)}` : undefined,
  );

  if (storageType === StorageType.ArweaveSol) {
    //@ts-ignore
    arweavePathManifestDataItem = bundlr.createTransaction(
      JSON.stringify(arweavePathManifest),
      { tags: arweavePathManifestTags },
    );

    await (arweavePathManifestDataItem as unknown as BundlrTransaction).sign();
    await arweavePathManifestDataItem.sign(signer);
  } else if (storageType === StorageType.ArweaveBundle) {
    arweavePathManifestDataItem = getArweavePathManifestDataItem(
      signer,
      arweavePathManifest,
    );
    await (arweavePathManifestDataItem as DataItem).sign(signer);
  }

  return {
    imageDataItem,
    animationDataItem,
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
export async function* makeArweaveBundleUploadGenerator(
  storage: StorageType,
  dirname: string,
  assets: AssetKey[],
  env: 'mainnet-beta' | 'devnet',
  jwk?: any,
  walletKeyPair?: Keypair,
  batchSize?: number,
  rpcUrl?: string,
): AsyncGenerator<UploadGeneratorResult> {
  let signer: ArweaveSigner;
  const storageType: StorageType = storage;
  if (storageType === StorageType.ArweaveSol && !walletKeyPair) {
    throw new Error(
      'To pay for uploads with SOL, you need to pass a Solana Keypair',
    );
  }
  if (storageType === StorageType.ArweaveBundle && !jwk) {
    throw new Error(
      'To pay for uploads with AR, you need to pass a Arweave JWK',
    );
  }

  if (storageType === StorageType.ArweaveBundle) {
    signer = new signers.ArweaveSigner(jwk);
  }

  const arweave = getArweave();
  const bundlr =
    storageType === StorageType.ArweaveSol
      ? env === 'mainnet-beta'
        ? new Bundlr(
            'https://node1.bundlr.network',
            'solana',
            walletKeyPair.secretKey,
            {
              timeout: 60000,
              providerUrl: rpcUrl ?? 'https://api.metaplex.solana.com',
            },
          )
        : new Bundlr(
            'https://devnet.bundlr.network',
            'solana',
            walletKeyPair.secretKey,
            {
              timeout: 60000,
              providerUrl: 'https://metaplex.devnet.rpcpool.com',
            },
          )
      : undefined;
  log.debug('Bundlr type is: ', env);
  const filePairs = assets.map((asset: AssetKey) => {
    const manifestPath = path.join(dirname, `${asset.index}.json`);
    const manifestData = getAssetManifest(dirname, asset.index);

    return {
      key: asset.index,
      image: path.join(dirname, `${manifestData.image}`),
      animation:
        'animation_url' in manifestData
          ? path.join(dirname, `${manifestData.animation_url}`)
          : undefined,
      manifest: manifestPath,
    };
  });

  if (storageType === StorageType.ArweaveSol) {
    const bytes = (await Promise.all(filePairs.map(getFilePairSize))).reduce(
      (a, b) => a + b,
      0,
    );
    const cost = await bundlr.utils.getPrice('solana', bytes);
    const bufferCost = cost.multipliedBy(3).dividedToIntegerBy(2);
    log.info(
      `${bufferCost.toNumber() / LAMPORTS} SOL to upload ${sizeMB(
        bytes,
      )}MB with buffer`,
    );
    const currentBalance = await bundlr.getLoadedBalance();
    if (currentBalance.lt(bufferCost)) {
      log.info(
        `Current balance ${
          currentBalance.toNumber() / LAMPORTS
        }. Sending fund txn...`,
      );
      await bundlr.fund(bufferCost.minus(currentBalance));
      log.info(`Successfully funded Arweave Bundler, starting upload`);
    } else {
      log.info(
        `Current balance ${
          currentBalance.toNumber() / LAMPORTS
        } is sufficient.`,
      );
    }
  }

  // As long as we still have file pairs needing upload, compute the next range
  // of file pairs we can include in the next bundle.
  while (filePairs.length) {
    const { count, size } = await getBundleRange(
      filePairs,
      storage === StorageType.ArweaveSol,
    );

    log.info(
      `Computed Bundle range, including ${count} file pair(s) totaling ${sizeMB(
        size,
      )}MB.`,
    );
    const bundleFilePairs = filePairs.splice(0, count);
    log.info('Processing file groups...');

    const progressBar = new cliProgress.SingleBar(
      {
        format: 'Progress: [{bar}] {percentage}% | {value}/{total}',
      },
      cliProgress.Presets.shades_classic,
    );

    progressBar.start(bundleFilePairs.length, 0);
    const { cacheKeys, dataItems, arweavePathManifestLinks, updatedManifests } =
      await bundleFilePairs.reduce<Promise<ProcessedBundleFilePairs>>(
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
          log.debug('Processing File Pair', filePair.key);

          const {
            imageDataItem,
            animationDataItem,
            manifestDataItem,
            arweavePathManifestDataItem,
            manifest,
          } = await processFiles({ storageType, signer, bundlr, filePair });

          const arweavePathManifestLink = `https://arweave.net/${manifestDataItem.id}`;

          acc.cacheKeys.push(filePair.key);
          acc.dataItems.push(
            imageDataItem as DataItem,
            manifestDataItem as DataItem,
            arweavePathManifestDataItem as DataItem,
          );
          if (filePair.animation) {
            acc.dataItems.push(animationDataItem as DataItem);
          }
          acc.arweavePathManifestLinks.push(arweavePathManifestLink);
          acc.updatedManifests.push(manifest);

          log.debug('Processed File Pair', filePair.key);
          progressBar.increment();
          return acc;
        },
        Promise.resolve({
          cacheKeys: [],
          dataItems: [],
          arweavePathManifestLinks: [],
          updatedManifests: [],
        }),
      );
    progressBar.stop();
    if (storageType === StorageType.ArweaveSol) {
      const bundlrTransactions = [
        ...dataItems,
      ] as unknown as BundlrTransaction[];
      log.info('Uploading bundle via Bundlr... in multiple transactions');
      const progressBar = new cliProgress.SingleBar(
        {
          format: 'Progress: [{bar}] {percentage}% | {value}/{total}',
        },
        cliProgress.Presets.shades_classic,
      );
      progressBar.start(bundlrTransactions.length, 0);

      let errored = false;
      await PromisePool.withConcurrency(batchSize || 20)
        .for(bundlrTransactions)
        .handleError(async err => {
          if (!errored) {
            errored = true;
            log.error(
              `\nCould not complete Bundlr tx upload successfully, exiting due to: `,
              err,
            );
          }
          throw err;
        })
        .process(async tx => {
          let attempts = 0;
          const uploadTransaction = async () => {
            await tx.upload().catch(async (err: Error) => {
              attempts++;
              if (attempts >= 3) {
                throw err;
              }
              log.debug(
                `Failed Bundlr tx upload, retrying transaction (attempt: ${attempts})`,
                err,
              );
              await sleep(5 * 1000);
              await uploadTransaction();
            });
          };

          await uploadTransaction();
          progressBar.increment();
        });

      progressBar.stop();
      log.info('Bundle uploaded!');
    }

    if (storageType === StorageType.ArweaveBundle) {
      const startBundleTime = Date.now();

      log.info('Bundling...');

      const bundle = await bundleAndSignData(dataItems, signer);
      const endBundleTime = Date.now();
      log.info(
        `Bundled ${dataItems.length} data items in ${
          (endBundleTime - startBundleTime) / 1000
        }s`,
      );
      // @ts-ignore
      // Argument of type
      // 'import("node_modules/arweave/node/common").default'
      // is not assignable to parameter of type
      // 'import("node_modules/arbundles/node_modules/arweave/node/common").default'.
      // Types of property 'api' are incompatible.
      const tx = await bundle.toTransaction(arweave, jwk);
      await arweave.transactions.sign(tx as Transaction, jwk);
      log.info('Uploading bundle via arbundle...');
      await arweave.transactions.post(tx);
      log.info('Bundle uploaded!', tx.id);
    }

    yield { cacheKeys, arweavePathManifestLinks, updatedManifests };
  }
}

export const withdrawBundlr = async (walletKeyPair: Keypair) => {
  const bundlr = new Bundlr(
    'https://node1.bundlr.network',
    'solana',
    walletKeyPair.secretKey,
  );
  const balance = await bundlr.getLoadedBalance();
  if (balance.minus(5000).lte(0)) {
    log.error(
      `Error: Balance in Bundlr node (${balance.dividedBy(
        LAMPORTS,
      )} SOL) is too low to withdraw.`,
    );
  } else {
    log.info(
      `Requesting a withdrawal of ${balance
        .minus(5000)
        .dividedBy(LAMPORTS)} SOL from Bundlr...`,
    );
    try {
      const withdrawResponse = await bundlr.withdrawBalance(
        balance.minus(5000),
      );
      if (withdrawResponse.status == 200) {
        log.info(
          `Successfully withdrew ${
            withdrawResponse.data.final / LAMPORTS
          } SOL.`,
        );
      } else if (withdrawResponse.status == 400) {
        log.info(withdrawResponse.data);
        log.info(
          'Withdraw unsucessful. An additional attempt will be made after all files are uploaded.',
        );
      }
    } catch (err) {
      log.error(
        'Error processing withdrawal request. Please try again using the withdraw_bundlr command in our CLI',
      );
      log.error('Error: ', err);
    }
  }
};
