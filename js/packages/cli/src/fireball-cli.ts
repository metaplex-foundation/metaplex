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
  Context,
  KeyedAccountInfo,
  Keypair,
  ProgramAccountChangeCallback,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  AccountLayout,
  Token,
} from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';
import { sha256 } from 'js-sha256';

import {
  getMetadata,
  getTokenWallet,
  loadFireballProgram,
} from './helpers/accounts';
import {
  loadCache,
  saveCache,
} from './helpers/cache';
import {
  ARWEAVE_PAYMENT_WALLET,
  FIREBALL_PREFIX,
  FIREBALL_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
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
    const anchorProgram = await loadFireballProgram(wallet, options.env);

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

programCommand('add_master_edition')
  .option(
    '--recipe <pubkey>',
    `Recipe to add master edition to`,
  )
  .option(
    '--mint <pubkey>',
    `Mint of master edition to transfer`,
  )
  .action(async (options) => {
    log.info(`Parsed options:`, options);

    const wallet = loadWalletKey(options.keypair);
    const anchorProgram = await loadFireballProgram(wallet, options.env);

    const recipeKey = new PublicKey(options.recipe);
    const mintKey = new PublicKey(options.mint);

    // transfer master edition to recipe
    const [recipeMintOwner, recipeMintBump] = await PublicKey.findProgramAddress(
      [
        FIREBALL_PREFIX,
        recipeKey.toBuffer(),
      ],
      FIREBALL_PROGRAM_ID
    );

    const [walletATA, ] = await PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    const [recipeATA, ] = await PublicKey.findProgramAddress(
      [
        recipeMintOwner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    const instructions : Array<TransactionInstruction> = [];
    instructions.push(Token.createAssociatedTokenAccountInstruction(
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintKey,
      recipeATA,
      recipeMintOwner,
      wallet.publicKey,
    ));

    instructions.push(Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      walletATA,
      recipeATA,
      wallet.publicKey,
      [],
      1
    ));

    const addResult = await sendTransactionWithRetry(
      anchorProgram.provider.connection,
      wallet,
      instructions,
      [],
    );

    log.info(addResult);
  })

programCommand('reclaim_master_edition')
  .option(
    '--recipe <pubkey>',
    `Recipe to add master edition to`,
  )
  .option(
    '--mint <pubkey>',
    `Mint of master edition to transfer`,
  )
  .action(async (options) => {
    log.info(`Parsed options:`, options);

    const wallet = loadWalletKey(options.keypair);
    const anchorProgram = await loadFireballProgram(wallet, options.env);

    const recipeKey = new PublicKey(options.recipe);
    const mintKey = new PublicKey(options.mint);

    // transfer master edition to recipe
    const [recipeMintOwner, recipeMintBump] = await PublicKey.findProgramAddress(
      [
        FIREBALL_PREFIX,
        recipeKey.toBuffer(),
      ],
      FIREBALL_PROGRAM_ID
    );

    const [walletATA, ] = await PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    const [recipeATA, ] = await PublicKey.findProgramAddress(
      [
        recipeMintOwner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );

    const instr = await anchorProgram.instruction.reclaimMasterEdition(
      recipeMintBump,
      {
        accounts: {
          recipe: recipeKey,
          masterMint: mintKey,
          masterTokenOwner: recipeMintOwner,
          from: recipeATA,
          to: walletATA,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [],
        instructions: [],
      }
    );

    const reclaimResult = await sendTransactionWithRetry(
      anchorProgram.provider.connection,
      wallet,
      [instr],
      [],
    );

    log.info(reclaimResult);
  })

programCommand('burn_crank')
  .option(
    '--dish <pubkey>',
    `Dish to burn (if not specified opens a program-account-subscribe)`,
  )
  .action(async (options) => {
    log.info(`Parsed options:`, options);

    const wallet = loadWalletKey(options.keypair);
    const anchorProgram = await loadFireballProgram(wallet, options.env);
    const connection = new RPCConnection(anchor.web3.clusterApiUrl(options.env));

    // TODO: anchor.accountDiscriminator
    const dishPrefix = Buffer.from(sha256.digest('account:Dish')).slice(0, 8);

    const burnCrank = async (keyedAccountInfo: KeyedAccountInfo, context: Context) => {
      const data = keyedAccountInfo.accountInfo.data;
      if (!data.slice(0, 8).equals(dishPrefix)) {
        return;
      }

      const dish = await anchorProgram.coder.accounts.decode("Dish", data);
      log.info(context.slot, keyedAccountInfo.accountId.toBase58(), dish)
      if (!dish.completed) {
        return;
      }

      const dishKey = keyedAccountInfo.accountId;
      const recipeKey = new PublicKey(dish.recipe);

      const recipe = await anchorProgram.account.recipe.fetch(recipeKey);

      const storeKeysAndBumps : Array<[PublicKey, number]> = await Promise.all(recipe.roots.map(
        (_, idx) => {
          const ingredientNum = new BN(idx);
          return PublicKey.findProgramAddress(
            [
              FIREBALL_PREFIX,
              dishKey.toBuffer(),
              Buffer.from(ingredientNum.toArray('le', 8)),
            ],
            FIREBALL_PROGRAM_ID,
          );
        }
      ));
      const storeAccounts = await connection.getMultipleAccountsInfo(
          storeKeysAndBumps.map(s => s[0]));

      // TODO: separate on overflow
      const instrs : Array<[TransactionInstruction, PublicKey]> = [];
      for (let idx = 0; idx < recipe.roots.length; ++idx) {
        const [storeKey, storeBump] = storeKeysAndBumps[idx];
        const storeAccount = storeAccounts[idx];
        if (storeAccount === null) {
          continue;
        }

        const ingredientNum = new BN(idx);
        const mintKey = new PublicKey(AccountLayout.decode(storeAccount.data).mint);
        instrs.push([
          await anchorProgram.instruction.consumeIngredient(
            storeBump,
            ingredientNum,
            {
              accounts: {
                recipe: recipeKey,
                dish: dishKey,
                ingredientMint: mintKey,
                ingredientStore: storeKey,
                payer: wallet.publicKey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
              },
              signers: [],
              instructions: [],
            }
          ),
          mintKey,
        ]);
      }

      if (instrs.length == 0) {
        return;
      }

      // send individually to allow retry of others on collision... hopefully
      // not an issue?
      for (const [instr, mintKey] of instrs) {
        try {
          const consumeResult = await sendTransactionWithRetry(
            connection,
            wallet,
            [instr],
            [],
          );

          log.info(consumeResult);
        } catch (err) {
          log.warn(`Failed to send instruction to consume ${mintKey.toBase58()}: ${err}`);
        }
      }
    };

    const burnCrankWrapper : ProgramAccountChangeCallback =
      (keyedAccountInfo: KeyedAccountInfo, context: Context) => {
        const wrap = async () => {
          try {
            await burnCrank(keyedAccountInfo, context);
          } catch (err) {
            log.error(`Burn crank failed for ${keyedAccountInfo.accountId.toBase58()}: ${err}`);
          }
        };
        wrap();
      }

    if (options.dish) {
      const dishKey = new PublicKey(options.dish);
      burnCrankWrapper(
        {
          accountId: dishKey,
          accountInfo: await connection.getAccountInfo(dishKey),
        },
        {
          slot: 0, // only logged
        }
      );
      return;
    }

    const subId = connection.onProgramAccountChange(
      FIREBALL_PROGRAM_ID,
      burnCrankWrapper);

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
