#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';
import { MintLayout, Token } from '@solana/spl-token';

import {
  chunks,
  fromUTF8Array,
  loadCache,
  parsePrice,
  saveCache,
  upload,
} from './helpers/various';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction } from './helpers/instructions';
import {
  CACHE_PATH,
  CONFIG_ARRAY_START,
  CONFIG_LINE_SIZE,
  EXTENSION_JSON,
  EXTENSION_PNG,
  PAYMENT_WALLET,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from './helpers/constants';
import { sendTransactionWithRetryWithKeypair } from './helpers/transactions';
import {
  createConfig,
  getCandyMachineAddress,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadAnchorProgram,
  loadWalletKey,
} from './helpers/accounts';
import { Config } from './types';

program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

program
  .command('upload')
  .argument(
    '<directory>',
    'Directory containing images named from 0-n',
    val => {
      return fs.readdirSync(`${val}`).map(file => path.join(val, file));
    },
  )
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  // .argument('[second]', 'integer argument', (val) => parseInt(val), 1000)
  .option('-n, --number <number>', 'Number of images to upload')
  .option('-c, --cache-name <string>', 'Cache file name', 'temp')
  .action(async (files: string[], options, cmd) => {
    const { number, keypair, env, cacheName } = cmd.opts();
    const parsedNumber = parseInt(number);

    const pngFileCount = files.filter(it => {
      return it.endsWith(EXTENSION_PNG);
    }).length;
    const jsonFileCount = files.filter(it => {
      return it.endsWith(EXTENSION_JSON);
    }).length;

    if (pngFileCount !== jsonFileCount) {
      throw new Error(
        `number of png files (${pngFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    }

    if (parsedNumber < pngFileCount) {
      throw new Error(
        `max number (${parsedNumber})cannot be smaller than the number of elements in the source folder (${pngFileCount})`,
      );
    }

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
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    let config = cacheContent.program.config
      ? new PublicKey(cacheContent.program.config)
      : undefined;

    for (let i = 0; i < SIZE; i++) {
      const image = images[i];
      const imageName = path.basename(image);
      const index = imageName.replace(EXTENSION_PNG, '');

      console.log(`Processing file: ${index}`);

      const storageCost = 10;

      let link = cacheContent?.items?.[index]?.link;
      if (!link || !cacheContent.program.uuid) {
        const manifestPath = image.replace(EXTENSION_PNG, '.json');
        const manifestContent = fs
          .readFileSync(manifestPath)
          .toString()
          .replace(imageName, 'image.png')
          .replace(imageName, 'image.png');
        const manifest = JSON.parse(manifestContent);

        const manifestBuffer = Buffer.from(JSON.stringify(manifest));

        if (i === 0 && !cacheContent.program.uuid) {
          // initialize config
          console.log(`initializing config`);
          try {
            const res = await createConfig(anchorProgram, walletKeyPair, {
              maxNumberOfLines: new BN(parsedNumber || SIZE),
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
            config = res.config;

            console.log(
              `initialized config for a candy machine with uuid: ${res.uuid}`,
            );

            saveCache(cacheName, env, cacheContent);
          } catch (exx) {
            console.error('Error deploying config to Solana network.', exx);
            // console.error(exx);
          }
        }

        if (!link) {
          const instructions = [
            anchor.web3.SystemProgram.transfer({
              fromPubkey: walletKeyPair.publicKey,
              toPubkey: PAYMENT_WALLET,
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
          console.info('transaction for arweave payment:', tx);

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
            const result = await upload(data, manifest, index);

            const metadataFile = result.messages?.find(
              m => m.filename === 'manifest.json',
            );
            if (metadataFile?.transactionId) {
              link = `https://arweave.net/${metadataFile.transactionId}`;
              console.log(`File uploaded: ${link}`);
            }
            console.log('setting cache for ', index);
            cacheContent.items[index] = {
              link,
              name: manifest.name,
              onChain: false,
            };
            saveCache(cacheName, env, cacheContent);
          } catch (er) {
            console.error(`Error uploading file ${index}`, er);
          }
        }
      }
    }

    let updateSuccessful = true;
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
                console.log(
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
                  console.log(
                    `saving config line ${ind}-${
                      keys[indexes[indexes.length - 1]]
                    } failed`,
                    e,
                  );
                  updateSuccessful = false;
                }
              }
            }
          },
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      saveCache(cacheName, env, cacheContent);
    }
    console.log(`Done. Successful = ${updateSuccessful}. If 'false' - rerun`);
  });

program
  .command('verify')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-c, --cache-name <string>', 'Cache file name', 'temp')
  .action(async (directory, cmd) => {
    const { env, keypair, cacheName } = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    const configAddress = new PublicKey(cacheContent.program.config);
    const config = await anchorProgram.provider.connection.getAccountInfo(
      configAddress,
    );
    let allGood = true;

    const keys = Object.keys(cacheContent.items);
    for (let i = 0; i < keys.length; i++) {
      console.log('Looking at key ', i);
      const key = keys[i];
      const thisSlice = config.data.slice(
        CONFIG_ARRAY_START + 4 + CONFIG_LINE_SIZE * i,
        CONFIG_ARRAY_START + 4 + CONFIG_LINE_SIZE * (i + 1),
      );
      const name = fromUTF8Array([...thisSlice.slice(4, 36)]);
      const uri = fromUTF8Array([...thisSlice.slice(40, 240)]);
      const cacheItem = cacheContent.items[key];
      if (!name.match(cacheItem.name) || !uri.match(cacheItem.link)) {
        console.log(
          'Name',
          name,
          'or uri',
          uri,
          'didnt match cache values of',
          cacheItem.name,
          'and',
          cacheItem.link,
          ' marking to rerun for image',
          key,
        );
        cacheItem.onChain = false;
        allGood = false;
      } else {
        console.debug('Name', name, 'with', uri, 'checked out');
      }
    }

    if (!allGood) {
      saveCache(cacheName, env, cacheContent);

      throw new Error(
        `not all NFTs checked out. check out logs above for details`,
      );
    }

    const configData = (await anchorProgram.account.config.fetch(
      configAddress,
    )) as Config;

    const lineCount = new BN(config.data.slice(247, 247 + 4), undefined, 'le');

    console.log(
      `uploaded (${lineCount.toNumber()}) out of (${
        configData.data.maxNumberOfLines
      })`,
    );
    if (configData.data.maxNumberOfLines > lineCount.toNumber()) {
      throw new Error(
        `predefined number of NFTs (${
          configData.data.maxNumberOfLines
        }) is smaller than the uploaded one (${lineCount.toNumber()})`,
      );
    } else {
      console.log('ready to deploy!');
    }

    saveCache(cacheName, env, cacheContent);
  });

program
  .command('create_candy_machine')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-c, --cache-name <string>', 'Cache file name', 'temp')
  .option('-p, --price <string>', 'SOL price', '1')
  .action(async (directory, cmd) => {
    const { keypair, env, price, cacheName } = cmd.opts();

    const lamports = parsePrice(price);
    const cacheContent = loadCache(cacheName, env);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    const config = new PublicKey(cacheContent.program.config);
    const [candyMachine, bump] = await getCandyMachineAddress(
      config,
      cacheContent.program.uuid,
    );
    await anchorProgram.rpc.initializeCandyMachine(
      bump,
      {
        uuid: cacheContent.program.uuid,
        price: new anchor.BN(lamports),
        itemsAvailable: new anchor.BN(Object.keys(cacheContent.items).length),
        goLiveDate: null,
      },
      {
        accounts: {
          candyMachine,
          wallet: walletKeyPair.publicKey,
          config: config,
          authority: walletKeyPair.publicKey,
          payer: walletKeyPair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [],
      },
    );

    console.log(`create_candy_machine Done: ${candyMachine.toBase58()}`);
  });

program
  .command('set_start_date')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-c, --cache-name <string>', 'Cache file name', 'temp')
  .option('-d, --date <string>', 'timestamp - eg "04 Dec 1995 00:12:00 GMT"')
  .action(async (directory, cmd) => {
    const { keypair, env, date, cacheName } = cmd.opts();
    const cacheContent = loadCache(cacheName, env);

    const secondsSinceEpoch = (date ? Date.parse(date) : Date.now()) / 1000;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [candyMachine, _] = await getCandyMachineAddress(
      new PublicKey(cacheContent.program.config),
      cacheContent.program.uuid,
    );
    const tx = await anchorProgram.rpc.updateCandyMachine(
      null,
      new anchor.BN(secondsSinceEpoch),
      {
        accounts: {
          candyMachine,
          authority: walletKeyPair.publicKey,
        },
      },
    );

    console.log('set_start_date Done', secondsSinceEpoch, tx);
  });

program
  .command('mint_one_token')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-c, --cache-name <string>', 'Cache file name', 'temp')
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName } = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const mint = Keypair.generate();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);
    const userTokenAccountAddress = await getTokenWallet(
      walletKeyPair.publicKey,
      mint.publicKey,
    );

    const configAddress = new PublicKey(cacheContent.program.config);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [candyMachineAddress, bump] = await getCandyMachineAddress(
      configAddress,
      cacheContent.program.uuid,
    );
    const candyMachine = await anchorProgram.account.candyMachine.fetch(
      candyMachineAddress,
    );
    const metadataAddress = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);
    const tx = await anchorProgram.rpc.mintNft({
      accounts: {
        config: configAddress,
        candyMachine: candyMachineAddress,
        payer: walletKeyPair.publicKey,
        //@ts-ignore
        wallet: candyMachine.wallet,
        mint: mint.publicKey,
        metadata: metadataAddress,
        masterEdition,
        mintAuthority: walletKeyPair.publicKey,
        updateAuthority: walletKeyPair.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [mint, walletKeyPair],
      instructions: [
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: walletKeyPair.publicKey,
          newAccountPubkey: mint.publicKey,
          space: MintLayout.span,
          lamports:
            await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
              MintLayout.span,
            ),
          programId: TOKEN_PROGRAM_ID,
        }),
        Token.createInitMintInstruction(
          TOKEN_PROGRAM_ID,
          mint.publicKey,
          0,
          walletKeyPair.publicKey,
          walletKeyPair.publicKey,
        ),
        createAssociatedTokenAccountInstruction(
          userTokenAccountAddress,
          walletKeyPair.publicKey,
          walletKeyPair.publicKey,
          mint.publicKey,
        ),
        Token.createMintToInstruction(
          TOKEN_PROGRAM_ID,
          mint.publicKey,
          userTokenAccountAddress,
          walletKeyPair.publicKey,
          [],
          1,
        ),
      ],
    });

    console.log('Done', tx);
  });

program.command('find-wallets').action(() => {});

program.parse(process.argv);
