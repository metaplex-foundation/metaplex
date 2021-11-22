import { EXTENSION_JSON, EXTENSION_PNG, EXTENSION_GIF } from '../helpers/constants';
import path from 'path';
import {
  createConfig,
  loadCandyProgram,
  loadWalletKey,
} from '../helpers/accounts';
import { PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { BN } from '@project-serum/anchor';
import { loadCache, saveCache } from '../helpers/cache';
import log from 'loglevel';
import { awsUpload } from '../helpers/upload/aws';
import { arweaveUpload } from '../helpers/upload/arweave';
import { ipfsCreds, ipfsUpload } from '../helpers/upload/ipfs';
import { chunks } from '../helpers/various';

export async function upload(
  files: string[],
  cacheName: string,
  env: string,
  keypair: string,
  totalNFTs: number,
  storage: string,
  retainAuthority: boolean,
  mutable: boolean,
  rpcUrl: string,
  ipfsCredentials: ipfsCreds,
  awsS3Bucket: string,
  batchSize: number,
): Promise<boolean> {
  let uploadSuccessful = true;

  const savedContent = loadCache(cacheName, env);
  const cacheContent = savedContent || {};

  if (!cacheContent.program) {
    cacheContent.program = {};
  }

  let existingInCache = [];
  if (!cacheContent.items) {
    cacheContent.items = {};
  } else {
    existingInCache = cacheContent.items;
  }

  console.log(`EXISTING IN CACHE: ${existingInCache}`);

  const seen = {};
  const newFiles = [];

  // Filter all the images
  files.forEach(f => {
	const imageExtension = path.extname(f);
	if (imageExtension == '.json') return ;
	const baseName = f.replace(imageExtension, '').split('/').pop();
    if (!seen[baseName]) {
      seen[baseName] = true;
      newFiles.push(f);
    }
  });
  Object.keys(existingInCache).forEach(f => {
	const extension = existingInCache[f].extension;
    if (!seen[f]) {
      seen[f] = true;
      newFiles.push(f + extension);
    }
  });

  const images = newFiles.filter(val => {
	const fileExtension = path.extname(val);
	switch(fileExtension) {
		case EXTENSION_GIF:
			return true
		case EXTENSION_PNG:
			return true
		default:
			return false
	}
  });
  const SIZE = images.length;

  const walletKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

  let config = cacheContent.program.config
    ? new PublicKey(cacheContent.program.config)
    : undefined;

  const tick = SIZE / 100; //print every one percent
  let lastPrinted = 0;
  await Promise.all(
    chunks(Array.from(Array(SIZE).keys()), batchSize || 1000).map(
      async allIndexesInSlice => {
        for (let ind = 0; ind < allIndexesInSlice.length; ind++) {
          const i = allIndexesInSlice[ind];
          const image = images[i];
          const imageName = path.basename(image);
			const imageExtension = path.extname(image);
          const index = imageName.replace(imageExtension, '');

          log.debug(`Processing file: ${i}`);

          let link = cacheContent?.items?.[index]?.link;
          let imageLink = cacheContent?.items?.[index]?.imageLink;
          if (!link || !cacheContent.program.uuid) {
            if (i >= lastPrinted + tick || i === 0) {
              lastPrinted = i;
              log.info(`Processing file: ${i}, ${imageName}`);
            }
            const manifestPath = image.replace(imageExtension, EXTENSION_JSON);
			const imageFileName = `image${imageExtension}`;
            const manifestContent = fs
              .readFileSync(manifestPath)
              .toString()
              .replace(imageName, imageFileName)
              .replace(imageName, imageFileName);
            const manifest = JSON.parse(manifestContent);

            const manifestBuffer = Buffer.from(JSON.stringify(manifest));

            if (i === 0 && !cacheContent.program.uuid) {
              // initialize config
              log.info(`initializing config`);
              try {
                const res = await createConfig(anchorProgram, walletKeyPair, {
                  maxNumberOfLines: new BN(totalNFTs),
                  symbol: manifest.symbol,
                  sellerFeeBasisPoints: manifest.seller_fee_basis_points,
                  isMutable: mutable,
                  maxSupply: new BN(0),
                  retainAuthority: retainAuthority,
                  creators: manifest.properties.creators.map(creator => {
                    return {
                      address: new PublicKey(creator.address),
                      verified: true,
                      share: creator.share,
                    };
                  }),
                });
                cacheContent.program.uuid = res.uuid;
                cacheContent.program.config = res.config.toBase58();
                config = res.config;

                log.info(
                  `initialized config for a candy machine with publickey: ${res.config.toBase58()}`,
                );

                saveCache(cacheName, env, cacheContent);
              } catch (exx) {
                log.error('Error deploying config to Solana network.', exx);
                throw exx;
              }
            }

            if (!link) {
              try {
                if (storage === 'arweave') {
                  [link, imageLink] = await arweaveUpload(
                    walletKeyPair,
                    anchorProgram,
                    env,
                    image,
                    manifestBuffer,
                    manifest,
                    index,
                  );
                } else if (storage === 'ipfs') {
                  [link, imageLink] = await ipfsUpload(
                    ipfsCredentials,
                    image,
                    manifestBuffer,
                  );
                } else if (storage === 'aws') {
                  [link, imageLink] = await awsUpload(
                    awsS3Bucket,
                    image,
                    manifestBuffer,
                  );
                }

                if (link && imageLink) {
                  log.debug('setting cache for ', index);
                  cacheContent.items[index] = {
                    link,
                    imageLink,
                    name: manifest.name,
					extension: imageExtension,
                    onChain: false,
                  };
                  cacheContent.authority = walletKeyPair.publicKey.toBase58();
                  saveCache(cacheName, env, cacheContent);
                }
              } catch (er) {
                uploadSuccessful = false;
                log.error(`Error uploading file ${index}`, er);
              }
            }
          } else {
            log.debug(`file ${index} already has a link`);
          }
        }
      },
    ),
  );
  saveCache(cacheName, env, cacheContent);

  const keys = Object.keys(cacheContent.items);
  try {
    await Promise.all(
      chunks(Array.from(Array(keys.length).keys()), 1000).map(
        async allIndexesInSlice => {
          const sliceInterval = 10;
          for (
            let offset = 0;
            offset < allIndexesInSlice.length;
            offset += sliceInterval
          ) {
            const indexes = allIndexesInSlice.slice(offset, offset + sliceInterval);
            const onChain = indexes.filter(i => {
              const index = keys[i];
              return cacheContent.items[index]?.onChain || false;
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
                    uri: cacheContent.items[keys[i]].link,
                    name: cacheContent.items[keys[i]].name,
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
                  cacheContent.items[keys[i]] = {
                    ...cacheContent.items[keys[i]],
                    onChain: true,
                  };
                });
                saveCache(cacheName, env, cacheContent);
              } catch (e) {
                log.error(
                  `saving config line ${ind}-${
                    keys[indexes[indexes.length - 1]]
                  } failed`,
                  e,
                );
                uploadSuccessful = false;
              }
            }
          }
        },
      ),
    );
  } catch (e) {
    log.error(e);
  } finally {
    saveCache(cacheName, env, cacheContent);
  }
  console.log(`Done. Successful = ${uploadSuccessful}.`);
  return uploadSuccessful;
}
