#!/usr/bin/env node
import * as fs from 'fs';
import Arweave from 'arweave';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';

const CACHE_PATH = './.cache';
const PAYMENT_WALLET = new anchor.web3.PublicKey(
  'HvwC9QSAzvGXhhVrgPmauVwFWcYZhne3hVot9EbHuFTm',
);
const KEY = '/Users/bartosz.lipinski/Workspace/arweave-keyfile.json';
const ENV = 'devnet';
const CANDY_MACHINE = 'candy_machine';

const programId = new anchor.web3.PublicKey(
  'cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ',
);

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

const getConfig = async (authority: anchor.web3.PublicKey, uuid: string) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), authority.toBuffer(), Buffer.from(uuid)],
    programId,
  );
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
  const configArrayStart =
    32 + // authority
    4 +
    6 + // uuid + u32 len
    4 +
    10 + // u32 len + symbol
    2 + // seller fee basis points
    1 +
    4 +
    5 * 34 + // optional + u32 len + actual vec
    8 + //max supply
    1 + //is mutable
    1 + // retain authority
    4; // max number of lines;
  const configLineSize = 4 + 32 + 4 + 200;
  const size =
    configArrayStart +
    4 +
    configData.maxNumberOfLines.toNumber() * configLineSize;

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
    '-u, --url',
    'Solana cluster url',
    'https://api.mainnet-beta.solana.com/',
  )
  .option('-k, --keypair <path>', 'Solana wallet')
  // .argument('[second]', 'integer argument', (val) => parseInt(val), 1000)
  .option('-s, --start-with', 'Image index to start with', '0')
  .option('-n, --number', 'Number of images to upload', '10000')
  .option('-c, --cache-name <path>', 'Cache file name')
  .action(async (files: string[], options, cmd) => {
    const extension = '.png';
    const { startWith, keypair } = cmd.opts();
    const cacheName = program.getOptionValue('cacheName') || 'temp';
    const cachePath = path.join(CACHE_PATH, cacheName);
    const savedContent = fs.existsSync(cachePath)
      ? JSON.parse(fs.readFileSync(cachePath).toString())
      : undefined;
    const cacheContent = savedContent || {};

    if (!cacheContent.program) {
      cacheContent.program = {};
    }

    if (!cacheContent.items) {
      cacheContent.items = {};
    }

    const images = files.filter(val => path.extname(val) === extension);
    const SIZE = images.length; // images.length;
    const walletKey = anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())),
    );

    // const conversionRates = JSON.parse(
    //   await (
    //     await fetch(
    //       'https://api.coingecko.com/api/v3/simple/price?ids=solana,arweave&vs_currencies=usd',
    //     )
    //   ).text(),
    // );
    // const baseCost = fetch(``);
    // const increment = fetch(``);

    const solConnection = new anchor.web3.Connection(
      `https://api.${ENV}.solana.com/`,
    );

    const walletWrapper = new anchor.Wallet(walletKey);
    const provider = new anchor.Provider(solConnection, walletWrapper, {
      preflightCommitment: 'recent',
    });
    const idl = await anchor.Program.fetchIdl(programId, provider);
    const anchorProgram = new anchor.Program(idl, programId, provider);
    let config = cacheContent.program.config
      ? new anchor.web3.PublicKey(cacheContent.program.config)
      : undefined;

    const block = await solConnection.getRecentBlockhash();
    for (let i = 0; i < SIZE; i++) {
      const image = images[i];
      const imageName = path.basename(image);
      const imageBuffer = Buffer.from(fs.readFileSync(image));
      const manifestPath = image.replace(extension, '.json');
      const manifestContent = fs
        .readFileSync(manifestPath)
        .toString()
        .replace(imageName, 'image.png')
        .replace(imageName, 'image.png');
      const manifest = JSON.parse(manifestContent);
      const index = imageName.replace(extension, '');

      console.log(`Processing file: ${index}`);
      const manifestBuffer = Buffer.from(JSON.stringify(manifest));

      if (i === 0 && !cacheContent.program.uuid) {
        // initialize config
        try {
          const res = await createConfig(anchorProgram, walletKey, {
            maxNumberOfLines: new BN(SIZE),
            symbol: manifest.symbol,
            sellerFeeBasisPoints: manifest.seller_fee_basis_points,
            isMutable: true,
            maxSupply: new BN(0),
            retainAuthority: true,
            creators: manifest.properties.creators.map(creator => {
              return {
                address: new anchor.web3.PublicKey(creator.address),
                verified: false,
                share: creator.share,
              };
            }),
          });
          cacheContent.program.uuid = res.uuid;
          cacheContent.program.config = res.config.toBase58();
          config = res.config;

          fs.writeFileSync(
            path.join(CACHE_PATH, cacheName),
            JSON.stringify(cacheContent),
          );
        } catch (exx) {
          console.error('Error deploying config to Solana network.', exx);
          // console.error(exx);
        }
      }

      const sizeInBytes = imageBuffer.length + manifestBuffer.length;
      const storageCost = 10;

      let link = cacheContent?.items?.[index]?.link;
      if (!link) {
        const tx = new anchor.web3.Transaction();
        tx.add(
          anchor.web3.SystemProgram.transfer({
            fromPubkey: walletKey.publicKey,
            toPubkey: PAYMENT_WALLET,
            lamports: storageCost,
          }),
        );

        tx.recentBlockhash = block.blockhash;
        tx.feePayer = walletKey.publicKey;
        tx.partialSign(walletKey);

        const serializedTransaction = tx.serialize().toString('base64');

        // data.append('tags', JSON.stringify(tags));
        // payment transaction
        const data = new FormData();
        data.append('transaction', serializedTransaction);
        data.append('env', ENV);
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
            onChain: false,
          };
          fs.writeFileSync(
            path.join(CACHE_PATH, cacheName),
            JSON.stringify(cacheContent),
          );
        } catch (er) {
          console.error(`Error uploading file ${index}`, er);
        }
      }

      if (link && config && !cacheContent.items[index].onChain) {
        console.log(`Storing link in on-chain config 🚀🚀🚀`);
        const txId = await anchorProgram.rpc.addConfigLines(
          i,
          [
            {
              uri: link,
              name: manifest.name,
            },
          ],
          {
            accounts: {
              config,
              authority: walletKey.publicKey,
            },
            signers: [walletKey],
          },
        );

        cacheContent.items[index] = {
          link,
          onChain: true,
        };

        fs.writeFileSync(
          path.join(CACHE_PATH, cacheName),
          JSON.stringify(cacheContent),
        );
      } else {
        console.log(`Config not initialized caching Arweave link.`);
      }
    }

    // TODO: start candy machine
  });

program
  .command('verify')
  .argument(
    '<directory>',
    'Directory containing images named from 0-n',
    val => {
      // return list of paths to each image
      return ['x', 'y'];
    },
  )
  .argument('[second]', 'integer argument', val => parseInt(val), 1000)
  .option('-n, --number', 'Number of images to upload', '10000')
  .action((directory, second, options) => {
    console.log(`${directory} + ${second} = ${1 + 2}`);
  });

program.command('find-wallets').action(() => {});

program.parse(process.argv);
