#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import log from 'loglevel';
import fetch from 'node-fetch';
import FormData from 'form-data';

import {
  Commitment,
  Connection as RPCConnection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';

import {
  getMetadata,
  getTokenWallet,
  loadCollectoooooorsProgram,
} from './helpers/accounts';
import {
  loadCache,
  saveCache,
} from './helpers/cache';
import {
  ARWEAVE_PAYMENT_WALLET,
  COLLECTOOOOOORS_PROGRAM_ID,
  EXTENSION_PNG,
  MAX_URI_LENGTH,
} from './helpers/constants';
import {
  sendSignedTransaction,
  sendTransactionWithRetryWithKeypair,
} from './helpers/transactions';
import {
  decodeMetadata,
} from './helpers/schema';
import {
  MerkleTree,
} from "./helpers/gumdrop/merkleTree";
import {
  ARWEAVE_UPLOAD_ENDPOINT,
  estimateManifestSize,
  fetchAssetCostToStore,
} from "./helpers/upload/arweave";

program.version('0.0.1');

const LOG_PATH = './.log';

if (!fs.existsSync(LOG_PATH)) {
  fs.mkdirSync(LOG_PATH);
}

log.setLevel(log.levels.DEBUG);

programCommand('create_recipe')
  .option(
    '--file <number>',
    `File specification`,
  )
  .action(async (options) => {
    log.info(`Parsed options:`, options);

    const mints = JSON.parse(fs.readFileSync(options.file).toString());
    const assoc = {};
    for (const mint of mints) {
      if (!(mint.ingredient in assoc)) {
        assoc[mint.ingredient] = {
          'ingredient': mint.ingredient,
          'mints': [],
        }
      }
      assoc[mint.ingredient].mints.push(new PublicKey(mint.mint));
    }
    const groups = [...Object.keys(assoc)].map(i => assoc[i]);

    for (const group of groups) {
      const tree = new MerkleTree(group.mints.map(m => m.toBuffer()));
      group['root'] = tree.getRoot();
    }

    const roots = groups.map(g => new Uint8Array(g.root));
    console.log(roots);

    const wallet = loadWalletKey(options.keypair);
    const anchorProgram = await loadCollectoooooorsProgram(wallet, options.env);

    const setup : Array<TransactionInstruction> = [];

    const recipe = Keypair.generate();

    const logDir = path.join(LOG_PATH, options.env, recipe.publicKey.toBase58());
    fs.mkdirSync(logDir, { recursive: true });

    const keyPath = path.join(logDir, 'id.json');
    log.info(`writing recipe key to ${keyPath}`);
    fs.writeFileSync(keyPath, JSON.stringify([...recipe.secretKey]));

    const recipeSize =
        8                         // discriminator
      + 32                        // Pubkey
      + 4 + MAX_URI_LENGTH        // String
      + 4 + roots.length * 32     // Vec
      ;

    const recipePath = path.join(logDir, 'manifest.json');
    log.info(`writing recipe manifest to ${recipePath}`);
    fs.writeFileSync(recipePath, JSON.stringify(groups.map(
      g => ({
        ingredient: g.ingredient,
        mints: g.mints.map(m => m.toBase58()),
        root: [...g.root],
      })
    )));

    const recipeContent = fs.readFileSync(recipePath).toString();
    const recipeBuffer = Buffer.from(JSON.stringify(JSON.parse(recipeContent)));

    const link = await arweaveUpload(
      wallet,
      anchorProgram,
      options.env,
      recipeBuffer,
    );

    const instr = await anchorProgram.instruction.createRecipes(
      link,
      roots,
      {
        accounts: {
          recipe: recipe.publicKey,
          authority: wallet.publicKey,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [recipe],
        instructions: [],
      }
    );

    const createResult = await sendTransactionWithRetry(
      anchorProgram.provider.connection,
      wallet,
      [instr],
      [recipe],
    );

    log.info(createResult);
  })

function programCommand(name: string) {
  return program
    .command(name)
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
    .option('-c, --cache-name <string>', 'Cache file name', 'asyncart')
    .option('-r, --rpc-url <string>', 'Custom rpc url')
    .option('-l, --log-level <string>', 'log level', setLogLevel);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
  if (value === undefined || value === null) {
    return;
  }
  log.info('setting the log value to: ' + value);
  log.setLevel(value);
}

function loadWalletKey(keypair): Keypair {
  if (!keypair || keypair == '') {
    throw new Error('Keypair is required!');
  }
  const loaded = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())),
  );
  log.info(`wallet public key: ${loaded.publicKey}`);
  return loaded;
}

function logPath(env: string, logName: string, cPath: string = LOG_PATH) {
  return path.join(cPath, `${env}-${logName}`);
}

async function sendTransactionWithRetry(
  connection: RPCConnection,
  wallet: Keypair,
  instructions: Array<TransactionInstruction>,
  signers: Array<Keypair>,
  commitment: Commitment = 'singleGossip',
): Promise<string | { txid: string; slot: number }> {
  const transaction = new Transaction();
  instructions.forEach(instruction => transaction.add(instruction));
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash(commitment)
  ).blockhash;

  transaction.setSigners(
    // fee payed by the wallet owner
    wallet.publicKey,
    ...signers.map(s => s.publicKey),
  );

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  transaction.partialSign(wallet);

  return sendSignedTransaction({
    connection,
    signedTransaction: transaction,
  });
}

async function upload(data: FormData) {
  return await (
    await fetch(ARWEAVE_UPLOAD_ENDPOINT, {
      method: 'POST',
      // @ts-ignore
      body: data,
    })
  ).json();
}

async function arweaveUpload(
  walletKeyPair,
  anchorProgram,
  env,
  recipeBuffer,
) {
  const estimatedManifestSize = estimateManifestSize([
    'metadata.json',
  ]);
  const storageCost = await fetchAssetCostToStore([
    recipeBuffer.length,
    estimatedManifestSize,
  ]);
  log.debug(`lamport cost to store: ${storageCost}`);

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
    'confirmed',
  );
  log.debug(`solana transaction (${env}) for arweave payment:`, tx);

  const data = new FormData();
  data.append('transaction', tx['txid']);
  data.append('env', env);
  data.append('file[]', recipeBuffer, 'metadata.json');

  const result = await upload(data);

  log.debug(result);

  const metadataFile = result.messages?.find(
    m => m.filename === 'metadata.json',
  );
  if (metadataFile?.transactionId) {
    const link = `https://arweave.net/${metadataFile.transactionId}`;
    log.debug(`File uploaded: ${link}`);
    return link;
  } else {
    // @todo improve
    throw new Error(`No transaction ID for upload`);
  }
}

program.parse(process.argv);
