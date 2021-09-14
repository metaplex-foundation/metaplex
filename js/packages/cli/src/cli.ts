#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';

import { fromUTF8Array, parsePrice } from './helpers/various';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { CACHE_PATH, CONFIG_ARRAY_START, CONFIG_LINE_SIZE, EXTENSION_JSON, EXTENSION_PNG, } from './helpers/constants';
import { getCandyMachineAddress, loadAnchorProgram, loadWalletKey, } from './helpers/accounts';
import { Config } from './types';
import { upload } from './commands/upload';
import { loadCache, saveCache } from './helpers/cache';
import { mint } from "./commands/mint";
import { signAllUnapprovedMetadata, signMetadata } from "./commands/sign";
import log from 'loglevel';

program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

log.setLevel(log.levels.INFO);

programCommand('upload')
  .argument(
    '<directory>',
    'Directory containing images named from 0-n',
    val => {
      return fs.readdirSync(`${val}`).map(file => path.join(val, file));
    },
  )
  .option('-n, --number <number>', 'Number of images to upload')
  .action(async (files: string[], options, cmd) => {
    const {number, keypair, env, cacheName} = cmd.opts();

    const pngFileCount = files.filter(it => {
      return it.endsWith(EXTENSION_PNG);
    }).length;
    const jsonFileCount = files.filter(it => {
      return it.endsWith(EXTENSION_JSON);
    }).length;

    const parsedNumber = parseInt(number);
    const elemCount = parsedNumber ? parsedNumber : pngFileCount;

    if (pngFileCount !== jsonFileCount) {
      throw new Error(`number of png files (${pngFileCount}) is different than the number of json files (${jsonFileCount})`);
    }

    if (elemCount < pngFileCount) {
      throw new Error(`max number (${elemCount})cannot be smaller than the number of elements in the source folder (${pngFileCount})`);
    }

    log.info(`Beginning the upload for ${elemCount} (png+json) pairs`)

    const startMs = Date.now();
    log.info("started at: " + startMs.toString())
    for (; ;) {
      const successful = await upload(files, cacheName, env, keypair, elemCount);
      if (successful) {
        break;
      } else {
        log.warn("upload was not successful, rerunning");
      }
    }
    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    log.info(`ended at: ${new Date(endMs).toString()}. time taken: ${timeTaken}`)

  });

programCommand('verify')
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
      log.debug('Looking at key ', i);
      const key = keys[i];
      const thisSlice = config.data.slice(
        CONFIG_ARRAY_START + 4 + CONFIG_LINE_SIZE * i,
        CONFIG_ARRAY_START + 4 + CONFIG_LINE_SIZE * (i + 1),
      );
      const name = fromUTF8Array([...thisSlice.slice(4, 36)]);
      const uri = fromUTF8Array([...thisSlice.slice(40, 240)]);
      const cacheItem = cacheContent.items[key];
      if (!name.match(cacheItem.name) || !uri.match(cacheItem.link)) {
        //leaving here for debugging reasons, but it's pretty useless. if the first upload fails - all others are wrong
        // console.log(
        //   `Name (${name}) or uri (${uri}) didnt match cache values of (${cacheItem.name})` +
        //   `and (${cacheItem.link}). marking to rerun for image`,
        //   key,
        // );
        cacheItem.onChain = false;
        allGood = false;
      } else {
        log.debug('Name', name, 'with', uri, 'checked out');
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

    log.info(
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
      log.info('ready to deploy!');
    }

    saveCache(cacheName, env, cacheContent);
  });

programCommand('create_candy_machine')
  .option('-p, --price <string>', 'Price denominated in SOL or spl-token override', '1')
  .option('-t, --spl-token <string>', 'SPL token used to price NFT mint. To use SOL leave this empty.')
  .option('-t, --spl-token-account <string>', 'SPL token account that receives mint payments. Only required if spl-token is specified.')
  .action(async (directory, cmd) => {
    const { keypair, env, price, cacheName, splToken, splTokenAccount } = cmd.opts();

    let parsedPrice = parsePrice(price);
    const cacheContent = loadCache(cacheName, env);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    let wallet = walletKeyPair.publicKey;
    const remainingAccounts = [];
    if (splToken || splTokenAccount) {
      if (!splToken) {
        throw new Error("If spl-token-account is set, spl-token must also be set")
      }
      const splTokenKey = new PublicKey(splToken);
      const splTokenAccountKey = new PublicKey(splTokenAccount);
      if (!splTokenAccount) {
        throw new Error("If spl-token is set, spl-token-account must also be set")
      }

      const token = new Token(
        anchorProgram.provider.connection,
        splTokenKey,
        TOKEN_PROGRAM_ID,
        walletKeyPair
      );

      const mintInfo = await token.getMintInfo();
      if (!mintInfo.isInitialized) {
        throw new Error(`The specified spl-token is not initialized`);
      }
      const tokenAccount = await token.getAccountInfo(splTokenAccountKey);
      if (!tokenAccount.isInitialized) {
        throw new Error(`The specified spl-token-account is not initialized`);
      }
      if (!tokenAccount.mint.equals(splTokenKey)) {
        throw new Error(`The spl-token-account's mint (${tokenAccount.mint.toString()}) does not match specified spl-token ${splTokenKey.toString()}`);
      }

      wallet = splTokenAccountKey;
      parsedPrice = parsePrice(price, 10 ** mintInfo.decimals);
      remainingAccounts.push({ pubkey: splTokenKey, isWritable: false, isSigner: false });
    }

    const config = new PublicKey(cacheContent.program.config);
    const [candyMachine, bump] = await getCandyMachineAddress(
      config,
      cacheContent.program.uuid,
    );
    await anchorProgram.rpc.initializeCandyMachine(
      bump,
      {
        uuid: cacheContent.program.uuid,
        price: new anchor.BN(parsedPrice),
        itemsAvailable: new anchor.BN(Object.keys(cacheContent.items).length),
        goLiveDate: null,
      },
      {
        accounts: {
          candyMachine,
          wallet,
          config: config,
          authority: walletKeyPair.publicKey,
          payer: walletKeyPair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [],
        remainingAccounts,
      },
    );

    saveCache(cacheName, env, cacheContent);
    log.info(`create_candy_machine finished. candy machine pubkey: ${candyMachine.toBase58()}`);
  });

programCommand('set_start_date')
  .option('-d, --date <string>', 'timestamp - eg "04 Dec 1995 00:12:00 GMT"')
  .action(async (directory, cmd) => {
    const { keypair, env, date, cacheName } = cmd.opts();
    const cacheContent = loadCache(cacheName, env);

    const secondsSinceEpoch = (date ? Date.parse(date) : Date.now()) / 1000;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    const [candyMachine] = await getCandyMachineAddress(
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

    log.info('set_start_date Done', secondsSinceEpoch, tx);
  });

programCommand('mint_one_token')
  .option('-t, --spl-token-account <string>', 'SPL token account to payfrom')
  .action(async (directory, cmd) => {
    const {keypair, env, cacheName, splTokenAccount} = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const configAddress = new PublicKey(cacheContent.program.config);
    const splTokenAccountKey = splTokenAccount ? new PublicKey(splTokenAccount) :  undefined;
    const tx = await mint(keypair, env, configAddress, splTokenAccountKey);

    log.info('Done', tx);
  });

programCommand('sign')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .option('-m, --metadata <string>', 'base58 metadata account id')
  .action(async (directory, cmd) => {
    const {keypair, env, metadata} = cmd.opts();

    await signMetadata(
      metadata,
      keypair,
      env
    );
  });

programCommand('sign_all')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const {keypair, env} = cmd.opts();

    await signAllUnapprovedMetadata(
      keypair,
      env
    );
  });

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
    .option('-l, --log-level <string>', 'log level', setLogLevel)
    .option('-c, --cache-name <string>', 'Cache file name', 'temp');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
  if (value === undefined || value === null){
    return
  }
  log.info("setting the log value to: " + value);
  log.setLevel(value);
}

program.command('find-wallets').action(() => {
});

program.parse(process.argv);
