import { EXTENSION_JSON, EXTENSION_PNG } from '../helpers/constants';
import path from 'path';
import {
  createCandyMachineV2,
  createConfig,
  getBalance,
  loadCandyProgram,
  loadWalletKey,
  WhitelistMintMode,
} from '../helpers/accounts';
import { PublicKey } from '@solana/web3.js';
import fs from 'fs';
import { BN } from '@project-serum/anchor';
import { loadCache, saveCache } from '../helpers/cache';
import log from 'loglevel';
import { awsUpload } from '../helpers/upload/aws';
import { arweaveUpload } from '../helpers/upload/arweave';
import { ipfsCreds, ipfsUpload } from '../helpers/upload/ipfs';
import { chunks, parsePrice } from '../helpers/various';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export async function uploadV2({
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
  batchSize,
  price,
  solTreasuryAccount,
  splTokenAccount,
  splToken,
  useCaptcha,
  goLiveDate,
  endSettings,
  whitelistMintSettings,
  hiddenSettings,
}: {
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
  batchSize: number;
  price: string;
  solTreasuryAccount: string;
  splTokenAccount: string;
  splToken: string;
  useCaptcha: boolean;
  goLiveDate: null | BN;
  endSettings: null | [number, BN];
  whitelistMintSettings: null | {
    mode: WhitelistMintMode;
    mint: PublicKey;
    presale: boolean;
    discountPrice: null | BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
}): Promise<boolean> {
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
    existingInCache = Object.keys(cacheContent.items);
  }

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
          const index = imageName.replace(EXTENSION_PNG, '');

          log.debug(`Processing file: ${i}`);

          let link = cacheContent?.items?.[index]?.link;
          let imageLink = cacheContent?.items?.[index]?.imageLink;
          if (!link || !cacheContent.program.uuid) {
            if (i >= lastPrinted + tick || i === 0) {
              lastPrinted = i;
              log.info(`Processing file: ${i}, ${imageName}`);
            }
            const manifestPath = image.replace(EXTENSION_PNG, EXTENSION_JSON);
            const manifestContent = fs
              .readFileSync(manifestPath)
              .toString()
              .replace(imageName, 'image.png')
              .replace(imageName, 'image.png');
            const manifest = JSON.parse(manifestContent);

            const manifestBuffer = Buffer.from(JSON.stringify(manifest));

            if (i === 0 && !cacheContent.program.uuid) {
              try {
                const remainingAccounts = [];
                let wallet = walletKeyPair.publicKey;
                let parsedPrice = parsePrice(price);
                if (splToken || splTokenAccount) {
                  if (solTreasuryAccount) {
                    throw new Error(
                      'If spl-token-account or spl-token is set then sol-treasury-account cannot be set',
                    );
                  }
                  if (!splToken) {
                    throw new Error(
                      'If spl-token-account is set, spl-token must also be set',
                    );
                  }
                  const splTokenKey = new PublicKey(splToken);
                  const splTokenAccountKey = new PublicKey(splTokenAccount);
                  if (!splTokenAccount) {
                    throw new Error(
                      'If spl-token is set, spl-token-account must also be set',
                    );
                  }

                  const token = new Token(
                    anchorProgram.provider.connection,
                    splTokenKey,
                    TOKEN_PROGRAM_ID,
                    walletKeyPair,
                  );

                  const mintInfo = await token.getMintInfo();
                  if (!mintInfo.isInitialized) {
                    throw new Error(
                      `The specified spl-token is not initialized`,
                    );
                  }
                  const tokenAccount = await token.getAccountInfo(
                    splTokenAccountKey,
                  );
                  if (!tokenAccount.isInitialized) {
                    throw new Error(
                      `The specified spl-token-account is not initialized`,
                    );
                  }
                  if (!tokenAccount.mint.equals(splTokenKey)) {
                    throw new Error(
                      `The spl-token-account's mint (${tokenAccount.mint.toString()}) does not match specified spl-token ${splTokenKey.toString()}`,
                    );
                  }

                  wallet = splTokenAccountKey;
                  parsedPrice = parsePrice(price, 10 ** mintInfo.decimals);
                  remainingAccounts.push({
                    pubkey: splTokenKey,
                    isWritable: false,
                    isSigner: false,
                  });
                }

                if (solTreasuryAccount) {
                  const treasuryAccount = new PublicKey(solTreasuryAccount);
                  const treasuryBalance = await getBalance(
                    treasuryAccount,
                    env,
                    rpcUrl,
                  );
                  if (treasuryBalance === 0) {
                    throw new Error(
                      `Cannot use treasury account with 0 balance!`,
                    );
                  }
                  wallet = treasuryAccount;
                }
                // initialize candy
                log.info(`initializing candy machine`);
                const res = await createCandyMachineV2(
                  anchorProgram,
                  walletKeyPair,
                  wallet,
                  {
                    itemsAvailable: new BN(totalNFTs),
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
                  },
                );
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
    existingInCache = Object.keys(cacheContent.items);
  }

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
          const index = imageName.replace(EXTENSION_PNG, '');

          log.debug(`Processing file: ${i}`);

          let link = cacheContent?.items?.[index]?.link;
          let imageLink = cacheContent?.items?.[index]?.imageLink;
          if (!link || !cacheContent.program.uuid) {
            if (i >= lastPrinted + tick || i === 0) {
              lastPrinted = i;
              log.info(`Processing file: ${i}, ${imageName}`);
            }
            const manifestPath = image.replace(EXTENSION_PNG, EXTENSION_JSON);
            const manifestContent = fs
              .readFileSync(manifestPath)
              .toString()
              .replace(imageName, 'image.png')
              .replace(imageName, 'image.png');
            const manifest = JSON.parse(manifestContent);

            const manifestBuffer = Buffer.from(JSON.stringify(manifest));

            if (i === 0 && !cacheContent.program.uuid) {
              try {
                // initialize config
                log.info(`initializing config`);
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
