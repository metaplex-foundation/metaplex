#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import BN from 'bn.js';
import { MintLayout, Token } from '@solana/spl-token';

import { fromUTF8Array, loadCache, parsePrice, saveCache } from './helpers/various';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction } from './helpers/instructions';
import {
  CACHE_PATH,
  CONFIG_ARRAY_START,
  CONFIG_LINE_SIZE,
  EXTENSION_JSON,
  EXTENSION_PNG,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from './helpers/constants';
import {
  getCandyMachineAddress,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadAnchorProgram,
  loadWalletKey,
} from './helpers/accounts';
import { Config } from "./types";
import { upload } from "./commands/upload";

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
  .option('-n, --number <number>', 'Number of images to upload', '10000')
  .option('-c, --cache-name <string>', 'Cache file name', 'temp')
  .action(async (files: string[], options, cmd) => {
    const {number, keypair, env, cacheName} = cmd.opts();
    const parsedNumber = parseInt(number);

    const pngFileCount = files.filter(it => {
      return it.endsWith(EXTENSION_PNG)
    }).length;
    const jsonFileCount = files.filter(it => {
      return it.endsWith(EXTENSION_JSON)
    }).length;

    if (pngFileCount !== jsonFileCount) {
      throw new Error(`number of png files (${pngFileCount}) is different than the number of json files (${jsonFileCount})`)
    }

    if (parsedNumber < pngFileCount) {
      throw new Error(`max number (${parsedNumber})cannot be smaller than the number of elements in the source folder (${pngFileCount})`)
    }

    for (; ;) {
      const successful = await upload(files, cacheName, env, keypair, parsedNumber);
      if (successful) {
        break;
      } else {
        console.log("upload was not successful, rerunning")
      }
    }

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
    const {env, keypair, cacheName} = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    const configAddress = new PublicKey(cacheContent.program.config);
    const config = await anchorProgram.provider.connection.getAccountInfo(configAddress);
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
        //leaving here for debugging reasons, but it's pretty useless. if the first upload fails - all others are wrong
        // console.log(
        //   `Name (${name}) or uri (${uri}) didnt match cache values of (${cacheItem.name})` +
        //   `and (${cacheItem.link}). marking to rerun for image`,
        //   key,
        // );
        cacheItem.onChain = false;
        allGood = false;
      } else {
        console.debug('Name', name, 'with', uri, 'checked out');
      }
    }

    if (!allGood) {
      throw new Error(`not all NFTs checked out. rerun the upload script`)
    }

    const configData = await anchorProgram.account.config.fetch(
      configAddress,
    ) as Config;

    const lineCount = new BN(config.data.slice(247, 247 + 4), undefined, 'le');

    console.log(`uploaded (${lineCount.toNumber()}) out of (${configData.data.maxNumberOfLines})`)
    if (configData.data.maxNumberOfLines > lineCount.toNumber()) {
      throw new Error(`predefined number of NFTs (${configData.data.maxNumberOfLines}) is smaller than the uploaded one (${lineCount.toNumber()})`)
    } else {
      console.log("ready to deploy!")
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
    const {keypair, env, price, cacheName} = cmd.opts();

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
    const {keypair, env, date, cacheName} = cmd.opts();
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

    console.log('set_start_date Done', secondsSinceEpoch, tx);
  });

program
  .command('update_price')
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
  .option('-p, --price <string>', 'SOL price')
  .action(async (directory, cmd) => {
    const {keypair, env, cacheName, price} = cmd.opts();

    const lamports = parsePrice(price);

    const cacheContent = loadCache(cacheName, env);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(walletKeyPair, env);

    const [candyMachine] = await getCandyMachineAddress(
      new PublicKey(cacheContent.program.config),
      cacheContent.program.uuid,
    );
    const tx = await anchorProgram.rpc.updateCandyMachine(
      new anchor.BN(lamports),
      null,
      {
        accounts: {
          candyMachine,
          authority: walletKeyPair.publicKey,
        },
      },
    );

    console.log('update_price Done', lamports, tx);
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
    const {keypair, env, cacheName} = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const mint = Keypair.generate();

    const userKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAnchorProgram(userKeyPair, env);
    const userTokenAccountAddress = await getTokenWallet(
      userKeyPair.publicKey,
      mint.publicKey,
    );

    const configAddress = new PublicKey(cacheContent.program.config);
    const [candyMachineAddress] = await getCandyMachineAddress(
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
        payer: userKeyPair.publicKey,
        //@ts-ignore
        wallet: candyMachine.wallet,
        mint: mint.publicKey,
        metadata: metadataAddress,
        masterEdition,
        mintAuthority: userKeyPair.publicKey,
        updateAuthority: userKeyPair.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [mint, userKeyPair],
      instructions: [
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: userKeyPair.publicKey,
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
          userKeyPair.publicKey,
          userKeyPair.publicKey,
        ),
        createAssociatedTokenAccountInstruction(
          userTokenAccountAddress,
          userKeyPair.publicKey,
          userKeyPair.publicKey,
          mint.publicKey,
        ),
        Token.createMintToInstruction(
          TOKEN_PROGRAM_ID,
          mint.publicKey,
          userTokenAccountAddress,
          userKeyPair.publicKey,
          [],
          1,
        ),
      ],
    });

    console.log('Done', tx);
  });

program.command('find-wallets').action(() => {
});

program.parse(process.argv);
