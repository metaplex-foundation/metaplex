#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';
import { MintLayout, Token } from '@solana/spl-token';

import {
  cachePath,
  chunks,
  fromUTF8Array,
  loadCache,
  saveCache,
} from './helpers/various';
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createConfigAccount,
} from './helpers/instructions';
import {
  CACHE_PATH,
  CONFIG_ARRAY_START,
  CONFIG_LINE_SIZE,
  PAYMENT_WALLET,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from './helpers/constants';
import { sendTransactionWithRetryWithKeypair } from './helpers/transactions';
import {
  getCandyMachineAddress,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadAnchorProgram,
  loadWalletKey,
} from './helpers/accounts';

program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

const createConfig = async function (
  anchorProgram: anchor.Program,
  payerWallet: Keypair,
  configData: {
    maxNumberOfLines: BN;
    symbol: string;
    sellerFeeBasisPoints: number;
    isMutable: boolean;
    maxSupply: BN;
    retainAuthority: boolean;
    creators: {
      address: PublicKey;
      verified: boolean;
      share: number;
    }[];
  },
) {
  const configAccount = Keypair.generate();
  const uuid = configAccount.publicKey.toBase58().slice(0, 6);

  return {
    config: configAccount.publicKey,
    uuid,
    txId: await anchorProgram.rpc.initializeConfig(
      {
        uuid,
        ...configData,
      },
      {
        accounts: {
          config: configAccount.publicKey,
          authority: payerWallet.publicKey,
          payer: payerWallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [payerWallet, configAccount],
        instructions: [
          await createConfigAccount(
            anchorProgram,
            configData,
            payerWallet.publicKey,
            configAccount.publicKey,
          ),
        ],
      },
    ),
  };
};

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
    '-e, --env',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  // .argument('[second]', 'integer argument', (val) => parseInt(val), 1000)
  .option('-s, --start-with <number>', 'Image index to start with', '0')
  .option('-n, --number <number>', 'Number of images to upload', '10000')
  .option('-c, --cache-name <string>', 'Cache file name', 'temp')
  .action(async (files: string[], options, cmd) => {
    const extension = '.png';
    const { startWith, keypair, env, cacheName } = cmd.opts();

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
      if (!seen[f.replace(extension, '').split('/').pop()]) {
        seen[f.replace(extension, '').split('/').pop()] = true;
        newFiles.push(f);
      }
    });
    existingInCache.forEach(f => {
      if (!seen[f]) {
        seen[f] = true;
        newFiles.push(f + '.png');
      }
    });

    const images = newFiles.filter(val => path.extname(val) === extension);
    const SIZE = images.length; // images.length;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    let config = cacheContent.program.config
      ? new PublicKey(cacheContent.program.config)
      : undefined;

    const block = await anchorProgram.provider.connection.getRecentBlockhash();
    for (let i = 0; i < SIZE; i++) {
      const image = images[i];
      const imageName = path.basename(image);
      const index = imageName.replace(extension, '');

      console.log(`Processing file: ${index}`);

      const storageCost = 10;

      let link = cacheContent?.items?.[index]?.link;
      if (!link || !cacheContent.program.uuid) {
        const manifestPath = image.replace(extension, '.json');
        const manifestContent = fs
          .readFileSync(manifestPath)
          .toString()
          .replace(imageName, 'image.png')
          .replace(imageName, 'image.png');
        const manifest = JSON.parse(manifestContent);

        const manifestBuffer = Buffer.from(JSON.stringify(manifest));

        if (i === 0 && !cacheContent.program.uuid) {
          // initialize config
          try {
            const res = await createConfig(anchorProgram, walletKeyPair, {
              maxNumberOfLines: new BN(SIZE),
              symbol: manifest.symbol,
              sellerFeeBasisPoints: manifest.seller_fee_basis_points,
              isMutable: true,
              maxSupply: new BN(0),
              retainAuthority: true,
              creators: manifest.properties.creators.map(creator => {
                return {
                  address: new PublicKey(creator.address),
                  verified: false,
                  share: creator.share,
                };
              }),
            });
            cacheContent.program.uuid = res.uuid;
            cacheContent.program.config = res.config.toBase58();
            config = res.config;

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
          data.append('file[]', fs.createReadStream(image), `image.png`);
          data.append('file[]', manifestBuffer, 'metadata.json');
          try {
            const result = await (
              await fetch(
                'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile3',
                {
                  method: 'POST',
                  body: data,
                },
              )
            ).json();

            const metadataFile = result.messages?.find(
              m => m.filename === 'manifest.json',
            );
            if (metadataFile?.transactionId) {
              link = `https://arweave.net/${metadataFile.transactionId}`;
              console.log(`File uploaded: ${link}`);
            }

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
                return cacheContent.items[index]?.onChain;
              });
              const ind = keys[indexes[0]];

              if (onChain.length != indexes.length) {
                console.log(
                  'Writing indices ',
                  ind,
                  '-',
                  keys[indexes[indexes.length - 1]],
                );
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
    console.log('Done');
    // TODO: start candy machine
  });

program
  .command('set_start_date')
  .option(
    '-e, --env',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-c, --cache-name <path>', 'Cache file name', 'temp')
  .option('-d, --date <string>', 'timestamp - eg "04 Dec 1995 00:12:00 GMT"')
  .action(async (directory, cmd) => {
    const { keypair, env, date } = cmd.opts();

    const cacheName = cmd.getOptionValue('cacheName') || 'temp';
    const cacheContent = loadCache(cacheName, env);

    const secondsSinceEpoch = (date ? Date.parse(date) : Date.now()) / 1000;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

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

    console.log('Done', secondsSinceEpoch, tx);
  });

program
  .command('create_candy_machine')
  .option(
    '-e, --env',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-c, --cache-name <path>', 'Cache file name', 'temp')
  .option('-p, --price <string>', 'SOL price', '1')
  .option('-d, --date <string>', 'timestamp - eg "04 Dec 1995 00:12:00 GMT"')
  .action(async (directory, cmd) => {
    const { keypair, env, price, cacheName, date } = cmd.opts();
    const secondsSinceEpoch = (date ? Date.parse(date) : Date.now()) / 1000;

    const lamports = parseInt(price) * LAMPORTS_PER_SOL;
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
        goLiveDate: secondsSinceEpoch,
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

    console.log(`Done: CANDYMACHINE: ${candyMachine.toBase58()}`);
  });

program
  .command('mint_one_token')
  .option(
    '-e, --env',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-c, --cache-name <path>', 'Cache file name', 'temp')
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

program
  .command('verify')
  .option(
    '-e, --env',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option('-c, --cache-name <path>', 'Cache file name', 'temp')
  .action(async (directory, cmd) => {
    const { env, cacheName } = cmd.opts();

    const solConnection = new anchor.web3.Connection(
      `https://api.${env}.solana.com/`,
    );

    const cacheContent = loadCache(cacheName, env);

    const config = await solConnection.getAccountInfo(
      new PublicKey(cacheContent.program.config),
    );
    const number = new BN(config.data.slice(247, 247 + 4), undefined, 'le');
    console.log('Number', number.toNumber());

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
      } else {
        console.log('Name', name, 'with', uri, 'checked out');
      }
    }
    saveCache(cacheName, env, cacheContent);
  });

program.command('find-wallets').action(() => {});

program.parse(process.argv);
