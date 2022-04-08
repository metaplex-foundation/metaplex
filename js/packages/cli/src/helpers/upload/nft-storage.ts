import log from 'loglevel';
// import fs from 'fs';
import path from 'path';
import { NFTStorageMetaplexor, NFTBundle } from '@nftstorage/metaplex-auth';
import { NFTStorage } from 'nft.storage';
import { Keypair } from '@solana/web3.js';
import * as cliProgress from 'cli-progress';
import { AssetKey } from '../../types';

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

export type NftStorageBundledAsset = {
  cacheKey: string;
  metadataJsonLink: string;
  updatedManifest: Manifest;
};

export type NftStorageBundleUploadResult = {
  assets: NftStorageBundledAsset[];
};

export async function* nftStorageUploadGenerator({
  dirname,
  assets,
  env,
  walletKeyPair,
  nftStorageKey,
  nftStorageGateway,
  batchSize,
}: {
  dirname: string;
  assets: AssetKey[];
  env: string;
  walletKeyPair: Keypair;
  nftStorageKey?: string | null;
  nftStorageGateway?: string | null;
  batchSize?: number | null;
}): AsyncGenerator<NftStorageBundleUploadResult> {
  // split asset keys into batches, each of which will be bundled into a CAR file and uploaded separately
  // default to 50 NFTs per "batch" if no batchSize is given.
  // larger batches require fewer signatures and will be slightly faster overall if everything is sucessful,
  // but smaller batches will take less time to retry if there's an error during upload.
  batchSize = batchSize || 50;
  batchSize = Math.min(batchSize, NFTBundle.MAX_ENTRIES);

  const numBatches = Math.ceil(assets.length / batchSize);
  const batches: AssetKey[][] = new Array(numBatches)
    .fill([])
    .map((_, i) => assets.slice(i * batchSize, (i + 1) * batchSize));

  log.info(`Uploading to nft.storage in ${batches.length} batches`);

  // upload the CAR file for a single bundle to nft.storage
  const uploadCar = async (cid, car, onStoredChunk) => {
    if (nftStorageKey) {
      const client = new NFTStorage({ token: nftStorageKey });
      return client.storeCar(car, { onStoredChunk });
    } else {
      const client = await NFTStorageMetaplexor.withSecretKey(
        walletKeyPair.secretKey,
        {
          solanaCluster: env,
          mintingAgent: 'metaplex/candy-machine-v2-cli',
        },
      );
      return client.storeCar(cid, car, { onStoredChunk });
    }
  };

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;
    const bundle = new NFTBundle();
    const bundled: NftStorageBundledAsset[] = [];

    log.debug(`Generating bundle #${batchNum} of ${batches.length}`);
    const packProgressBar = new cliProgress.SingleBar(
      {
        format: `Generating bundle #${batchNum}: [{bar}] {percentage}% | {value}/{total}`,
      },
      cliProgress.Presets.shades_classic,
    );
    packProgressBar.start(batch.length, 0);
    for (const asset of batch) {
      const manifestPath = path.join(dirname, `${asset.index}.json`);
      const imagePath = path.join(dirname, asset.index + asset.mediaExt);
      // if animation_url is set to a filepath, that will be picked up by
      // bundle.addNFTFromFileSystem below.

      log.debug(
        `Adding NFT ${asset.index} to bundle #${batchNum} from ${manifestPath}`,
      );

      const nft = await bundle.addNFTFromFileSystem(manifestPath, imagePath, {
        id: asset.index,
        gatewayHost: nftStorageGateway,
      });

      bundled.push({
        cacheKey: asset.index,
        metadataJsonLink: nft.metadataGatewayURL,
        updatedManifest: nft.metadata as unknown as Manifest,
      });
      packProgressBar.update(bundled.length);
    }
    packProgressBar.stop();

    const { car, cid } = await bundle.asCAR();
    const totalSize = await bundle.getRawSize();

    const uploadProgressBar = new cliProgress.SingleBar(
      {
        format: `Uploading bundle #${batchNum}: [{bar}] {percentage}%`,
      },
      cliProgress.Presets.shades_classic,
    );

    let stored = 0;
    uploadProgressBar.start(totalSize, stored);
    const onStoredChunk = (size: number) => {
      stored += size;
      uploadProgressBar.update(stored);
    };
    const bundleCID = await uploadCar(cid, car, onStoredChunk);

    uploadProgressBar.stop();
    log.info(
      `Completed upload for bundle #${batchNum} of ${batches.length}. Bundle root CID: ${bundleCID}`,
    );

    yield {
      assets: bundled,
    };
  }
}
