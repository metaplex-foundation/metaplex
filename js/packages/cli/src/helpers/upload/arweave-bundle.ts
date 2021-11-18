import { readFile, stat } from 'fs/promises';
import path from 'path';
import Arweave from 'arweave';
import {
  ArweaveSigner,
  bundleAndSignData,
  createData,
  DataItem,
} from 'arbundles';
import log from 'loglevel';
import { EXTENSION_PNG } from '../constants';

/**
 * The Arweave Path Manifest object for a given asset file pair.
 * https://github.com/ArweaveTeam/arweave/blob/master/doc/path-manifest-schema.md
 */
type ArweavePathManifest = {
  manifest: 'arweave/paths';
  version: '0.1.0';
  paths: {
    'image.png': {
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
 * The Manifest object for a given asset.
 * This object holds the contents of the asset's JSON file.
 * Represented here in its minimal form.
 */
type Manifest = {
  image: string;
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
// arBundles has a limit of 250MB, we use our own limit way below that to
// lower the risk for having to re-upload filepairs if the matching manifests
// upload fail on voluminous collections.
// Change at your own risk.
const BUNDLE_SIZE_BYTE_LIMIT = 200 * 1000 * 1000;

/**
 * Tags to include with every individual transaction.
 */
const BASE_TAGS = [{ name: 'App-Name', value: 'Metaplex Candy Machine' }];

const CONTENT_TYPES = {
  png: 'image/png',
};

const contentTypeTags = {
  png: { name: 'Content-Type', value: CONTENT_TYPES['png'] },
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
function sizeMB(bytes: number): number {
  return bytes / (1000 * 1000);
}

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
  manifest: string;
};

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
async function getBundleRange(filePairs: FilePair[]): Promise<BundleRange> {
  let total = 0;
  let count = 0;
  for (const { key, image, manifest } of filePairs) {
    const filePairSize = await [image, manifest].reduce(async (accP, file) => {
      const acc = await accP;
      const { size } = await stat(file);
      return acc + size;
    }, Promise.resolve(0));

    if (total + filePairSize >= BUNDLE_SIZE_BYTE_LIMIT) {
      if (count === 0) {
        throw new Error(
          `Image + Manifest filepair (${key}) too big (${sizeMB(
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

const imageTags = [...BASE_TAGS, contentTypeTags['png']];
/**
 * Retrieve a DataItem which will hold the asset's image binary data
 * & represent an individual Arweave transaction which can be signed & bundled.
 */
async function getImageDataItem(
  signer: ArweaveSigner,
  image: string,
): Promise<DataItem> {
  return createData(await readFile(image), signer, {
    tags: imageTags,
  });
}

const manifestTags = [...BASE_TAGS, contentTypeTags['json']];
/**
 * Retrieve a DataItem which will hold the asset's manifest binary data
 * & represent an individual Arweave transaction which can be signed & bundled.
 */
function getManifestDataItem(
  signer: ArweaveSigner,
  manifest: Manifest,
): DataItem {
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
  signer: ArweaveSigner,
  arweavePathManifest: ArweavePathManifest,
): DataItem {
  return createData(JSON.stringify(arweavePathManifest), signer, {
    tags: arweavePathManifestTags,
  });
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
  imageTxId: string,
  manifestTxId: string,
): ArweavePathManifest {
  const arweavePathManifest: ArweavePathManifest = {
    manifest: 'arweave/paths',
    version: '0.1.0',
    paths: {
      'image.png': {
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

/**
 * Retrieve an asset's manifest from the filesystem & update it with the link
 * to the asset's image link, obtained from signing the asset image DataItem.
 */
async function getUpdatedManifest(
  manifestPath: string,
  imageLink: string,
): Promise<Manifest> {
  const manifest: Manifest = JSON.parse(
    (await readFile(manifestPath)).toString(),
  );
  manifest.image = imageLink;
  manifest.properties.files = [{ type: CONTENT_TYPES['png'], uri: imageLink }];

  return manifest;
}

/**
 * Initialize the Arweave Bundle Upload Generator.
 * Returns a Generator function that allows to trigger an asynchronous bundle
 * upload to Arweave when calling generator.next().
 * The Arweave Bundle Upload Generator automatically groups assets file pairs
 * into appropriately sized bundles.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
 */
export function* makeArweaveBundleUploadGenerator(
  dirname: string,
  assets: string[],
  jwk: any,
): Generator<Promise<UploadGeneratorResult>> {
  const signer = new ArweaveSigner(jwk);
  const arweave = getArweave();

  const filePairs = assets.map(asset => ({
    key: asset,
    image: path.join(dirname, `${asset}${EXTENSION_PNG}`),
    manifest: path.join(dirname, `${asset}.json`),
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
    const result = getBundleRange(filePairs).then(async function processBundle({
      count,
      size,
    }) {
      log.info(
        `Computed Bundle range, including ${count} file pair(s) totaling ${size} bytes.`,
      );
      const bundleFilePairs = filePairs.splice(0, count);

      const {
        cacheKeys,
        dataItems,
        arweavePathManifestLinks,
        updatedManifests,
      } = await bundleFilePairs.reduce<Promise<ProcessedBundleFilePairs>>(
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

          const imageDataItem = await getImageDataItem(signer, filePair.image);
          await imageDataItem.sign(signer);
          const imageLink = `https://arweave.net/${imageDataItem.id}`;

          const manifest = await getUpdatedManifest(
            filePair.manifest,
            imageLink,
          );
          const manifestDataItem = getManifestDataItem(signer, manifest);
          await manifestDataItem.sign(signer);

          const arweavePathManifest = createArweavePathManifest(
            manifestDataItem.id,
            imageDataItem.id,
          );
          const arweavePathManifestDataItem = getArweavePathManifestDataItem(
            signer,
            arweavePathManifest,
          );
          await arweavePathManifestDataItem.sign(signer);
          const arweavePathManifestLink = `https://arweave.net/${manifestDataItem.id}`;

          acc.cacheKeys.push(filePair.key);
          acc.dataItems.push(
            imageDataItem,
            manifestDataItem,
            arweavePathManifestDataItem,
          );
          acc.arweavePathManifestLinks.push(arweavePathManifestLink);
          acc.updatedManifests.push(manifest);

          log.info('Processed File Pair', filePair.key);
          return acc;
        },
        Promise.resolve({
          cacheKeys: [],
          dataItems: [],
          arweavePathManifestLinks: [],
          updatedManifests: [],
        }),
      );

      log.debug('Bundling...');
      const bundle = await bundleAndSignData(dataItems, signer);
      // @ts-ignore
      // Argument of type
      // 'import("node_modules/arweave/node/common").default'
      // is not assignable to parameter of type
      // 'import("node_modules/arbundles/node_modules/arweave/node/common").default'.
      // Types of property 'api' are incompatible.
      const tx = await bundle.toTransaction(arweave, jwk);
      await arweave.transactions.sign(tx, jwk);
      log.info('Uploading bundle...');
      await arweave.transactions.post(tx);
      log.info('Bundle uploaded!', tx.id);

      return { cacheKeys, arweavePathManifestLinks, updatedManifests };
    });
    yield result;
  }
}
