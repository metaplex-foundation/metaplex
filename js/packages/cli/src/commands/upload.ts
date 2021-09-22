import { EXTENSION_PNG, ARWEAVE_PAYMENT_WALLET } from '../helpers/constants';
import path from 'path';
import {
  createConfig,
  loadCandyProgram,
  loadWalletKey,
} from '../helpers/accounts';
import { PublicKey } from '@solana/web3.js';
import fs from 'fs';
import BN from 'bn.js';
import * as anchor from '@project-serum/anchor';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import FormData from 'form-data';
import { loadCache, saveCache } from '../helpers/cache';
import fetch from 'node-fetch';
import log from 'loglevel';

export async function upload(
  files: string[],
  cacheName: string,
  env: string,
  keypair: string
): Promise<boolean> {
  let uploadSuccessful = true;
  const cacheContent = loadCache(cacheName, env) || {};

  if (!cacheContent.items) cacheContent.items = {};
  const existingInCache = Object.keys(cacheContent.items);

  const seen = {};
  const newFiles = [];

  files.forEach(f => {
    if (!seen[f.replace(EXTENSION_PNG, '').split('/').pop()]) {
      seen[f.replace(EXTENSION_PNG, '').split('/').pop()] = true;
      newFiles.push(f);
    }
  });
  existingInCache.forEach(f => {
    if (!seen[f]) {
      seen[f] = true;
      newFiles.push(f + '.png');
    }
  });

  const images = newFiles.filter(val => path.extname(val) === EXTENSION_PNG);
  const SIZE = images.length;

  const walletKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgram(walletKeyPair, env);

  let uploadCount = 0;
  for (let i = 0; i < SIZE; i++) {
    const image = images[i];
    const imageName = path.basename(image);
    const index = imageName.replace(EXTENSION_PNG, '');

    log.debug(`Processing file: ${i}`);
    if (i % 50 === 0) {
      log.info(`Processing file: ${i}`);
    }

    const storageCost = 10;
    let link = cacheContent?.items?.[index]?.link;
    // Skip if the link already exists
    if (link) continue;

    const manifestPath = image.replace(EXTENSION_PNG, '.json');
    const manifestContent = fs
      .readFileSync(manifestPath)
      .toString()
      .replace(imageName, 'image.png')
      .replace(imageName, 'image.png');
    const manifest = JSON.parse(manifestContent);
    const manifestBuffer = Buffer.from(JSON.stringify(manifest));
    const instructions = [
      anchor.web3.SystemProgram.transfer({
        fromPubkey: walletKeyPair.publicKey,
        toPubkey: ARWEAVE_PAYMENT_WALLET,
        lamports: storageCost,
      }),
    ];

    const tx = await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      [],
      'single',
    );
    log.debug('transaction for arweave payment:', tx);

    // data.append('tags', JSON.stringify(tags));
    // payment transaction
    const data = new FormData();
    data.append('transaction', tx['txid']);
    data.append('env', env);
    data.append('file[]', fs.createReadStream(image), {
      filename: `image.png`,
      contentType: 'image/png',
    });
    data.append('file[]', manifestBuffer, 'metadata.json');
    try {
      const result = await uploadToArweave(data, manifest, index);

      const metadataFile = result.messages?.find(
        m => m.filename === 'manifest.json',
      );
      if (metadataFile?.transactionId) {
        link = `https://arweave.net/${metadataFile.transactionId}`;
        log.debug(`File uploaded: ${link}`);
        uploadCount += 1;
      }

      cacheContent.items[index] = {
        link,
        name: manifest.name,
        onChain: false,
      };
      saveCache(cacheName, env, cacheContent);
    } catch (er) {
      uploadSuccessful = false;
      log.error(`Error uploading file ${index}`, er);
    }
  }
  console.log(`Done. Successful = ${uploadSuccessful}. Uploaded ${uploadCount} files`);
  return uploadSuccessful;
}

export async function populate(
  cacheName: string,
  env: string,
  keypair: string
) {
  let uploadSuccessful = true;
  const cacheContent = loadCache(cacheName, env) || {};
  const walletKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgram(walletKeyPair, env);

  const keys = Object.keys(cacheContent.items);
  if (!cacheContent.items || keys.length == 0)
    return log.error('No items to populate');

  if (keys.some(key => !cacheContent.items[key].link))
    return log.error('An item is missing a link. Run the "upload" command first')

  if (!cacheContent.program) {
    cacheContent.program = {};
    // initialize config
    log.info(`initializing config`);

    // Fetch  the first item to retreive the config
    const link = cacheContent.items[keys[0]].link;
    const manifest = await (await fetch(link, { method: 'GET' })).json();

    try {
      const res = await createConfig(anchorProgram, walletKeyPair, {
        maxNumberOfLines: new BN(keys.length),
        symbol: manifest.symbol,
        sellerFeeBasisPoints: manifest.seller_fee_basis_points,
        isMutable: true,
        maxSupply: new BN(0),
        retainAuthority: true,
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
      saveCache(cacheName, env, cacheContent);
      log.info(
        `initialized config for a candy machine with publickey: ${res.config.toBase58()}`,
      );
    } catch (exx) {
      log.error('Error deploying config to Solana network.', exx);
      throw exx;
    }
  }

  const config = new PublicKey(cacheContent.program.config);
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

async function uploadToArweave(data: FormData, manifest, index) {
  log.debug(`trying to upload ${index}.png: ${manifest.name}`);
  return await (
    await fetch(
      'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile4',
      {
        method: 'POST',
        // @ts-ignore
        body: data,
      },
    )
  ).json();
}

function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}
