import { web3 } from '@project-serum/anchor';
import log from 'loglevel';
import path from 'path';
import { loadCache, saveCache } from '../helpers/cache';
import { StorageType } from '../helpers/storage-type';
import {
  makeArweaveBundleUploadGenerator,
  withdrawBundlr,
} from '../helpers/upload/arweave-bundle';
import { sleep } from '../helpers/various';
import {
  getAssetKeysNeedingUpload,
  getAssetManifest,
  updateCacheAfterUpload,
} from './upload';

export async function uploadBundle({
  files,
  cacheName,
  env,
  totalNFTs,
  batchSize,
  walletKeyPair,
  rpcUrl,
}: {
  files: string[];
  cacheName: string;
  env: 'mainnet-beta' | 'devnet';
  totalNFTs: number;
  batchSize?: number;
  walletKeyPair: web3.Keypair;
  rpcUrl: null | string;
}): Promise<boolean> {
  const savedContent = loadCache(cacheName, env);
  const cacheContent = savedContent || {};

  if (!cacheContent.program) {
    cacheContent.program = {};
  }

  if (!cacheContent.items) {
    cacheContent.items = {};
  }

  const dedupedAssetKeys = getAssetKeysNeedingUpload(cacheContent.items, files);
  const dirname = path.dirname(files[0]);

  if (!cacheContent.program.uuid) {
    const firstAssetManifest = getAssetManifest(
      dirname,
      path.basename(files[0], path.extname(files[0])),
    );

    try {
      if (
        !firstAssetManifest.properties?.creators?.every(
          creator => creator.address !== undefined,
        )
      ) {
        throw new Error('Creator address is missing');
      }

      saveCache(cacheName, env, cacheContent);
    } catch (exx) {
      log.error('Error deploying config to Solana network.', exx);
      throw exx;
    }
  } else {
    log.info(
      `config for a candy machine with publickey: ${cacheContent.program.candyMachine} has been already initialized`,
    );
  }

  const uploadedItems = Object.values(cacheContent.items).filter(
    (f: { link: string }) => !!f.link,
  ).length;

  log.info(`[${uploadedItems}] out of [${totalNFTs}] items have been uploaded`);

  if (dedupedAssetKeys.length) {
    log.info(
      `Starting upload for [${
        dedupedAssetKeys.length
      }] items, format ${JSON.stringify(dedupedAssetKeys[0])}`,
    );
  }

  if (dedupedAssetKeys.length) {
    // Initialize the Arweave Bundle Upload Generator.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
    const arweaveBundleUploadGenerator = makeArweaveBundleUploadGenerator(
      StorageType.ArweaveSol,
      dirname,
      dedupedAssetKeys,
      env,
      undefined,
      walletKeyPair,
      batchSize,
      rpcUrl,
    );

    // Loop over every uploaded bundle of asset filepairs (PNG + JSON)
    // and save the results to the Cache object, persist it to the Cache file.
    for await (const value of arweaveBundleUploadGenerator) {
      const { cacheKeys, arweavePathManifestLinks, updatedManifests } = value;

      updateCacheAfterUpload(
        cacheContent,
        cacheKeys,
        arweavePathManifestLinks,
        updatedManifests.map(m => m.name),
      );

      saveCache(cacheName, env, cacheContent);
      log.info('Saved bundle upload result to cache.');
    }
    log.info('Upload done. Cleaning up...');
    // if (env !== "devnet") {
    log.info('Waiting 5 seconds to check Bundlr balance.');
    await sleep(5000);
    await withdrawBundlr(walletKeyPair);
    // }
    saveCache(cacheName, env, cacheContent);
  }

  let uploadSuccessful = true;

  console.log(`Done. Successful = ${uploadSuccessful}.`);
  return uploadSuccessful;
}
