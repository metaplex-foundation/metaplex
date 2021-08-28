#!/usr/bin/env node
import * as fs from 'fs';
import Arweave from 'arweave';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { program } from 'commander';
import * as anchor from "@project-serum/anchor";
import BN from 'bn.js';

const CACHE_PATH = './.cache';
const PAYMENT_WALLET = new anchor.web3.PublicKey('HvwC9QSAzvGXhhVrgPmauVwFWcYZhne3hVot9EbHuFTm');
const KEY = '/Users/bartosz.lipinski/Workspace/arweave-keyfile.json';
const ENV = 'devnet';
const CANDY_MACHINE = "candy_machine";

const programId = new anchor.web3.PublicKey(
  "cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ"
);

program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

const getCandyMachine = async (
  config: anchor.web3.PublicKey,
  uuid: string
) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
    programId
  );
};

const getConfig = async (authority: anchor.web3.PublicKey, uuid: string) => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), authority.toBuffer(), Buffer.from(uuid)],
    programId
  );
};

const createConfig = async function (
  program,
  payerWallet: anchor.web3.Keypair,
  configData: {
    maxNumberOfLines: BN,
    symbol: string,
    sellerFeeBasisPoints: number,
    isMutable: boolean,
    maxSupply: BN,
    retainAuthority: boolean,
    creators: { address: anchor.web3.PublicKey, verified: boolean, share: number }[],
  },
): Promise<any> {
  const uuid = anchor.web3.Keypair.generate().publicKey.toBase58().slice(0, 6);
  const [config, bump] = await getConfig(payerWallet.publicKey, uuid);

  return {
    config,
    txId: await program.rpc.initializeConfig(
      bump,
      {
        uuid,
        ...configData,
      },
      {
        accounts: {
          config,
          authority: payerWallet.publicKey,
          payer: payerWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [payerWallet],
      }
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
  .option('-u, --url', 'Solana cluster url', 'https://api.mainnet-beta.solana.com/')
  .option('-k, --keypair', 'Solana wallet', '/Users/bartosz.lipinski/aury7LJUae7a92PBo35vVbP61GX8VbyxFKausvUtBrt.json')
  // .argument('[second]', 'integer argument', (val) => parseInt(val), 1000)
  .option('-s, --start-with', 'Image index to start with', '0')
  .option('-n, --number', 'Number of images to upload', '10000')
  .option('-c, --cache', 'Cache file name', 'temp')
  .action(async (files: string[], options, cmd) => {
    const extension = '.png';
    const { startWith, keypair, cache } = cmd.opts();
    const cacheContent = {
      items: {},
    };


    const images = files.filter(val => path.extname(val) === extension);
    const walletKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())));

    // const conversionRates = JSON.parse(
    //   await (
    //     await fetch(
    //       'https://api.coingecko.com/api/v3/simple/price?ids=solana,arweave&vs_currencies=usd',
    //     )
    //   ).text(),
    // );
    // const baseCost = fetch(``);
    // const increment = fetch(``);

    const solConnection = new anchor.web3.Connection(`https://api.${ENV}.solana.com/`);

    const walletWrapper = new anchor.Wallet(walletKey);
    const provider = new anchor.Provider(solConnection, walletWrapper, {
      preflightCommitment: "recent",
    });
    const idl = await anchor.Program.fetchIdl(programId, provider);
    console.log(idl);
    const program = new anchor.Program(idl, programId, provider);

    const SIZE = 10;
    const block = await solConnection.getRecentBlockhash();
    for (let i = 0; i < SIZE; i++) {
      console.log(`Processing file: ${i}`);
      const image = images[i];
      const imageBuffer = Buffer.from(fs.readFileSync(image));
      const manifest = JSON.parse(Buffer.from(fs.readFileSync(image.replace(extension, '.json'))).toString());
      const manifestBuffer = Buffer.from(JSON.stringify(manifest));

      if (i === 0) {
        // initialize config
        try {
          const res = await createConfig(program, walletKey, {
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
              }
            }),
          })
          console.log(res)
        }
        catch(exx) {
          console.error(exx);
        }
      }

      const sizeInBytes = imageBuffer.length + manifestBuffer.length;
      const storageCost = 10;

        const tx = new anchor.web3.Transaction();
        tx.add(anchor.web3.SystemProgram.transfer({
          fromPubkey: walletKey.publicKey,
          toPubkey: PAYMENT_WALLET,
          lamports: storageCost,
        }));

        tx.recentBlockhash = block.blockhash;
        tx.feePayer = walletKey.publicKey;
        tx.partialSign(walletKey);


        const serializedTransaction = tx.serialize().toString('base64');

        // data.append('tags', JSON.stringify(tags));
        // payment transaction
        const data = new FormData();
        data.append('transaction', serializedTransaction);
        data.append('env', ENV);
        data.append('file[]', fs.createReadStream(image), `${i}.png`);
        data.append('file[]', fs.createReadStream(image.replace(extension, '.json')), 'metadata.json');
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
            const arweaveLink = `https://arweave.net/${metadataFile.transactionId}`;
            console.log(`File uploaded: ${arweaveLink}`);

            cacheContent[i] = {
              arweaveLink,
            };
            fs.writeFileSync(path.join(CACHE_PATH, cache), JSON.stringify(cacheContent));
          }
      } catch {
        console.error(`Error uploading file ${i}`)
      }
    }




    // TODO: read cache content and upload to solana




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


