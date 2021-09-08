#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';
import { MintLayout, Token } from '@solana/spl-token';

import {
 LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';

const CACHE_PATH = './.cache';
const PAYMENT_WALLET = new anchor.web3.PublicKey(
  'HvwC9QSAzvGXhhVrgPmauVwFWcYZhne3hVot9EbHuFTm',
);
const ENV = 'devnet';
const CANDY_MACHINE = 'candy_machine';

const programId = new anchor.web3.PublicKey(
  'cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ',
);
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const getTokenWallet = async function (wallet: PublicKey, mint: PublicKey) {
  return (
    await PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    )
  )[0];
};

export function createAssociatedTokenAccountInstruction(
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey,
) {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

const getCandyMachine = async (config: anchor.web3.PublicKey, uuid: string) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
    programId,
  );
};

// const getConfig = async (authority: anchor.web3.PublicKey, uuid: string) => {
//   return await anchor.web3.PublicKey.findProgramAddress(
//     [Buffer.from(CANDY_MACHINE), authority.toBuffer(), Buffer.from(uuid)],
//     programId,
//   );
// };

const getMetadata = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

const getMasterEdition = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

const createConfig = async function (
  anchorProgram: anchor.Program,
  payerWallet: anchor.web3.Keypair,
  configData: {
    maxNumberOfLines: BN;
    symbol: string;
    sellerFeeBasisPoints: number;
    isMutable: boolean;
    maxSupply: BN;
    retainAuthority: boolean;
    creators: {
      address: anchor.web3.PublicKey;
      verified: boolean;
      share: number;
    }[];
  },
) {
  const size =
    configArrayStart +
    4 +
    configData.maxNumberOfLines.toNumber() * configLineSize +
    4 +
    Math.ceil(configData.maxNumberOfLines.toNumber() / 8);

  const config = anchor.web3.Keypair.generate();
  const uuid = config.publicKey.toBase58().slice(0, 6);

  return {
    config: config.publicKey,
    uuid,
    txId: await anchorProgram.rpc.initializeConfig(
      {
        uuid,
        ...configData,
      },
      {
        accounts: {
          config: config.publicKey,
          authority: payerWallet.publicKey,
          payer: payerWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [payerWallet, config],
        instructions: [
          anchor.web3.SystemProgram.createAccount({
            fromPubkey: payerWallet.publicKey,
            newAccountPubkey: config.publicKey,
            space: size,
            lamports:
              await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
                size,
              ),
            programId: programId,
          }),
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
  .option('-s, --start-with', 'Image index to start with', '0')
  .option('-n, --number', 'Number of images to upload', '10000')
  .option('-c, --cache-name <path>', 'Cache file name')
  .action(async (files: string[], options, cmd) => {
    const extension = '.png';
    const { keypair } = cmd.opts();
    const cacheName = program.getOptionValue('cacheName') || 'temp';
    const cachePath = path.join(CACHE_PATH, cacheName);
    const savedContent = fs.existsSync(cachePath)
      ? JSON.parse(fs.readFileSync(cachePath).toString())
      : undefined;
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
        //const imageBuffer = Buffer.from(fs.readFileSync(image));
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
                return cacheContent.items[index]?.onChain;
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
  .command('set_start_date')
  .option('-k, --keypair <path>', 'Solana wallet')
  .option('-c, --cache-name <path>', 'Cache file name')
  .option('-d, --date <string>', 'timestamp - eg "04 Dec 1995 00:12:00 GMT"')
  .action(async (directory, cmd) => {
    const solConnection = new anchor.web3.Connection(
      `https://api.${ENV}.solana.com/`,
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
  .option('-k, --keypair <path>', 'Solana wallet')
  .option('-c, --cache-name <path>', 'Cache file name')
  .option('-p, --price <string>', 'SOL price')
  .action(async (directory, cmd) => {
    const solConnection = new anchor.web3.Connection(
      `https://api.${ENV}.solana.com/`,
    );

    const lamports = parsePrice(price);
    const cacheContent = loadCache(cacheName, env);
    const lamports = parseInt(solPriceStr) * LAMPORTS_PER_SOL;

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
  .command('mint_one_token')
  .option('-k, --keypair <path>', `The purchaser's wallet key`)
  .option('-c, --cache-name <path>', 'Cache file name')
  .action(async (directory, cmd) => {
    const solConnection = new anchor.web3.Connection(
      `https://api.${ENV}.solana.com/`,
    );

    const { keypair } = cmd.opts();
    // const solPriceStr = program.getOptionValue('price') || '1';
    //const lamports = parseInt(solPriceStr) * LAMPORTS_PER_SOL;

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
  program
  .command('verify')
  .option('-c, --cache-name <path>', 'Cache file name')
  .action(async () => {
    const solConnection = new anchor.web3.Connection(
      `https://api.${ENV}.solana.com/`,
    );
    const cacheName = program.getOptionValue('cacheName') || 'temp';
    const cachePath = path.join(CACHE_PATH, cacheName);
    const cachedContent = fs.existsSync(cachePath)
      ? JSON.parse(fs.readFileSync(cachePath).toString())
      : undefined;

    const config = await solConnection.getAccountInfo(
      new PublicKey(cachedContent.program.config),
    );
    const number = new BN(config.data.slice(247, 247 + 4), undefined, 'le');
    console.log('Number', number.toNumber());

    const keys = Object.keys(cachedContent.items);
    for (let i = 0; i < keys.length; i++) {
      console.log('Looking at key ', i);
      const key = keys[i];
      const thisSlice = config.data.slice(
        configArrayStart + 4 + configLineSize * i,
        configArrayStart + 4 + configLineSize * (i + 1),
      );
      const name = fromUTF8Array([...thisSlice.slice(4, 36)]);
      const uri = fromUTF8Array([...thisSlice.slice(40, 240)]);
      const cacheItem = cachedContent.items[key];
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
    fs.writeFileSync(
      path.join(CACHE_PATH, cacheName),
      JSON.stringify(cachedContent),
    );
  });

program.command('find-wallets').action(() => {});

program.parse(process.argv);
