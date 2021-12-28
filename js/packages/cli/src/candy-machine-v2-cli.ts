#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';

import {
  chunks,
  fromUTF8Array,
  getCandyMachineV2Config,
  parsePrice,
  shuffle,
} from './helpers/various';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  CACHE_PATH,
  CONFIG_LINE_SIZE_V2,
  EXTENSION_JSON,
  CANDY_MACHINE_PROGRAM_V2_ID,
  CONFIG_ARRAY_START_V2,
} from './helpers/constants';
import {
  getProgramAccounts,
  loadCandyProgramV2,
  loadWalletKey,
  AccountAndPubkey,
} from './helpers/accounts';

import { uploadV2 } from './commands/upload';
import { verifyTokenMetadata } from './commands/verifyTokenMetadata';
import { generateConfigurations } from './commands/generateConfigurations';
import { loadCache, saveCache } from './helpers/cache';
import { mintV2 } from './commands/mint';
import { signMetadata } from './commands/sign';
import {
  getAccountsByCreatorAddress,
  signAllMetadataFromCandyMachine,
} from './commands/signAll';
import log from 'loglevel';
import { createMetadataFiles } from './helpers/metadata';
import { createGenerativeArt } from './commands/createArt';
import { withdrawV2 } from './commands/withdraw';
import { updateFromCache } from './commands/updateFromCache';
import { StorageType } from './helpers/storage-type';
import { getType } from 'mime';
program.version('0.0.2');
const supportedImageTypes = {
  'image/png': 1,
  'image/gif': 1,
  'image/jpeg': 1,
};

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
  .option(
    '-cp, --config-path <string>',
    'JSON file with candy machine settings',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (files: string[], options, cmd) => {
    const { keypair, env, cacheName, configPath, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    const {
      storage,
      ipfsInfuraProjectId,
      number,
      ipfsInfuraSecret,
      arweaveJwk,
      awsS3Bucket,
      retainAuthority,
      mutable,
      batchSize,
      price,
      splToken,
      treasuryWallet,
      gatekeeper,
      endSettings,
      hiddenSettings,
      whitelistMintSettings,
      goLiveDate,
      uuid,
    } = await getCandyMachineV2Config(walletKeyPair, anchorProgram, configPath);

    if (storage === StorageType.ArweaveSol && env !== 'mainnet-beta') {
      throw new Error(
        'The arweave-sol storage option only works on mainnet. For devnet, please use either arweave, aws or ipfs\n',
      );
    }

    if (storage === StorageType.ArweaveBundle && env !== 'mainnet-beta') {
      throw new Error(
        'The arweave-bundle storage option only works on mainnet because it requires spending real AR tokens. For devnet, please set the --storage option to "aws" or "ipfs"\n',
      );
    }

    if (storage === StorageType.Arweave) {
      log.warn(
        'WARNING: The "arweave" storage option will be going away soon. Please migrate to arweave-bundle or arweave-sol for mainnet.\n',
      );
    }

    if (storage === StorageType.ArweaveBundle && !arweaveJwk) {
      throw new Error(
        'Path to Arweave JWK wallet file (--arweave-jwk) must be provided when using arweave-bundle',
      );
    }
    if (
      storage === StorageType.Ipfs &&
      (!ipfsInfuraProjectId || !ipfsInfuraSecret)
    ) {
      throw new Error(
        'IPFS selected as storage option but Infura project id or secret key were not provided.',
      );
    }
    if (storage === StorageType.Aws && !awsS3Bucket) {
      throw new Error(
        'aws selected as storage option but existing bucket name (--aws-s3-bucket) not provided.',
      );
    }
    if (!Object.values(StorageType).includes(storage)) {
      throw new Error(
        `Storage option must either be ${Object.values(StorageType).join(
          ', ',
        )}. Got: ${storage}`,
      );
    }
    const ipfsCredentials = {
      projectId: ipfsInfuraProjectId,
      secretKey: ipfsInfuraSecret,
    };

    const imageFiles = files.filter(it => {
      return !it.endsWith(EXTENSION_JSON);
    });
    const imageFileCount = imageFiles.length;

    imageFiles.forEach(it => {
      if (!supportedImageTypes[getType(it)]) {
        throw new Error(`The file ${it} is not a supported file type.`);
      }
    });

    const jsonFileCount = files.filter(it => {
      return it.endsWith(EXTENSION_JSON);
    }).length;

    const elemCount = number ? number : imageFileCount;

    if (imageFileCount !== jsonFileCount) {
      throw new Error(
        `number of img files (${imageFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    }

    if (elemCount < imageFileCount) {
      throw new Error(
        `max number (${elemCount})cannot be smaller than the number of elements in the source folder (${imageFileCount})`,
      );
    }

    log.info(`Beginning the upload for ${elemCount} (img+json) pairs`);

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    try {
      await uploadV2({
        files,
        cacheName,
        env,
        totalNFTs: elemCount,
        gatekeeper,
        storage,
        retainAuthority,
        mutable,
        ipfsCredentials,
        awsS3Bucket,
        batchSize,
        price,
        treasuryWallet,
        anchorProgram,
        walletKeyPair,
        splToken,
        endSettings,
        hiddenSettings,
        whitelistMintSettings,
        goLiveDate,
        uuid,
        arweaveJwk,
      });
    } catch (err) {
      log.warn('upload was not successful, please re-run.', err);
    }
    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    log.info(
      `ended at: ${new Date(endMs).toISOString()}. time taken: ${timeTaken}`,
    );
  });

programCommand('withdraw')
  .option(
    '-d ,--dry',
    'Show Candy Machine withdraw amount without withdrawing.',
  )
  .option('-ch, --charity <string>', 'Which charity?', '')
  .option('-cp, --charityPercent <string>', 'Which percent to charity?', '0')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, dry, charity, charityPercent, rpcUrl } = cmd.opts();
    if (charityPercent < 0 || charityPercent > 100) {
      log.error('Charity percentage needs to be between 0 and 100');
      return;
    }
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);
    const configOrCommitment = {
      commitment: 'confirmed',
      filters: [
        {
          memcmp: {
            offset: 8,
            bytes: walletKeyPair.publicKey.toBase58(),
          },
        },
      ],
    };
    const machines: AccountAndPubkey[] = await getProgramAccounts(
      anchorProgram.provider.connection,
      CANDY_MACHINE_PROGRAM_V2_ID.toBase58(),
      configOrCommitment,
    );
    let t = 0;
    for (const cg in machines) {
      t += machines[cg].account.lamports;
    }
    const totalValue = t / LAMPORTS_PER_SOL;
    const cpf = parseFloat(charityPercent);
    let charityPub;
    log.info(
      `Total Number of Candy Machine Config Accounts to drain ${machines.length}`,
    );
    log.info(`${totalValue} SOL locked up in configs`);
    if (!!charity && charityPercent > 0) {
      const donation = totalValue * (100 / charityPercent);
      charityPub = new PublicKey(charity);
      log.info(
        `Of that ${totalValue} SOL, ${donation} will be donated to ${charity}. Thank you!`,
      );
    }

    if (!dry) {
      const errors = [];
      log.info(
        'WARNING: This command will drain ALL of the Candy Machine config accounts that are owned by your current KeyPair, this will break your Candy Machine if its still in use',
      );
      for (const cg of machines) {
        try {
          if (cg.account.lamports > 0) {
            const tx = await withdrawV2(
              anchorProgram,
              walletKeyPair,
              env,
              new PublicKey(cg.pubkey),
              cg.account.lamports,
              charityPub,
              cpf,
            );
            log.info(
              `${cg.pubkey} has been withdrawn. \nTransaction Signarure: ${tx}`,
            );
          }
        } catch (e) {
          log.error(
            `Withdraw has failed for config account ${cg.pubkey} Error: ${e.message}`,
          );
          errors.push(e);
        }
      }
      const successCount = machines.length - errors.length;
      const richness =
        successCount === machines.length ? 'rich again' : 'kinda rich';
      log.info(
        `Congratulations, ${successCount} config accounts have been successfully drained.`,
      );
      log.info(
        `Now you ${richness}, please consider supporting Open Source developers.`,
      );
    }
  });

programCommand('verify_token_metadata')
  .argument(
    '<directory>',
    'Directory containing images and metadata files named from 0-n',
    val => {
      return fs
        .readdirSync(`${val}`)
        .map(file => path.join(process.cwd(), val, file));
    },
  )
  .option('-n, --number <number>', 'Number of images to upload')
  .action((files: string[], options, cmd) => {
    const { number } = cmd.opts();

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    verifyTokenMetadata({ files, uploadElementsCount: number });

    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    log.info(
      `ended at: ${new Date(endMs).toString()}. time taken: ${timeTaken}`,
    );
  });

programCommand('verify')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { env, keypair, rpcUrl, cacheName } = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    const candyMachine = await anchorProgram.provider.connection.getAccountInfo(
      new PublicKey(cacheContent.program.candyMachine),
    );

    const candyMachineObj = await anchorProgram.account.candyMachine.fetch(
      new PublicKey(cacheContent.program.candyMachine),
    );
    let allGood = true;

    const keys = Object.keys(cacheContent.items).filter(
      k => !cacheContent.items[k].verifyRun,
    );
    console.log('Key size', keys.length);
    await Promise.all(
      chunks(Array.from(Array(keys.length).keys()), 500).map(
        async allIndexesInSlice => {
          for (let i = 0; i < allIndexesInSlice.length; i++) {
            // Save frequently.
            if (i % 100 == 0) saveCache(cacheName, env, cacheContent);

            const key = keys[allIndexesInSlice[i]];
            log.debug('Looking at key ', allIndexesInSlice[i]);

            const thisSlice = candyMachine.data.slice(
              CONFIG_ARRAY_START_V2 +
                4 +
                CONFIG_LINE_SIZE_V2 * allIndexesInSlice[i],
              CONFIG_ARRAY_START_V2 +
                4 +
                CONFIG_LINE_SIZE_V2 * (allIndexesInSlice[i] + 1),
            );
            const name = fromUTF8Array([...thisSlice.slice(2, 34)]);
            const uri = fromUTF8Array([...thisSlice.slice(40, 240)]);
            const cacheItem = cacheContent.items[key];
            if (!name.match(cacheItem.name) || !uri.match(cacheItem.link)) {
              //leaving here for debugging reasons, but it's pretty useless. if the first upload fails - all others are wrong
              /*log.info(
                `Name (${name}) or uri (${uri}) didnt match cache values of (${cacheItem.name})` +
                  `and (${cacheItem.link}). marking to rerun for image`,
                key,
              );*/
              cacheItem.onChain = false;
              allGood = false;
            }
            cacheItem.verifyRun = true;
          }
        },
      ),
    );

    if (!allGood) {
      saveCache(cacheName, env, cacheContent);

      throw new Error(
        `not all NFTs checked out. check out logs above for details`,
      );
    }

    const lineCount = new anchor.BN(
      candyMachine.data.slice(CONFIG_ARRAY_START_V2, CONFIG_ARRAY_START_V2 + 4),
      undefined,
      'le',
    );

    log.info(
      `uploaded (${lineCount.toNumber()}) out of (${
        candyMachineObj.data.itemsAvailable
      })`,
    );
    if (candyMachineObj.data.itemsAvailable > lineCount.toNumber()) {
      throw new Error(
        `predefined number of NFTs (${
          candyMachineObj.data.itemsAvailable
        }) is smaller than the uploaded one (${lineCount.toNumber()})`,
      );
    } else {
      log.info('ready to deploy!');
    }

    saveCache(cacheName, env, cacheContent);
  });

programCommand('verify_price')
  .option('-p, --price <string>')
  .option('--cache-path <string>')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, price, cacheName, rpcUrl, cachePath } = cmd.opts();
    const lamports = parsePrice(price);

    if (isNaN(lamports)) {
      return log.error(`verify_price requires a --price to be set`);
    }

    log.info(`Expected price is: ${lamports}`);

    const cacheContent = loadCache(cacheName, env, cachePath);

    if (!cacheContent) {
      return log.error(
        `No cache found, can't continue. Make sure you are in the correct directory where the assets are located or use the --cache-path option.`,
      );
    }

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    const candyAddress = new PublicKey(cacheContent.program.candyMachine);

    const machine = await anchorProgram.account.candyMachine.fetch(
      candyAddress,
    );

    //@ts-ignore
    const candyMachineLamports = machine.data.price.toNumber();

    log.info(`Candymachine price is: ${candyMachineLamports}`);

    if (lamports != candyMachineLamports) {
      throw new Error(`Expected price and CandyMachine's price do not match!`);
    }

    log.info(`Good to go!`);
  });

programCommand('show')
  .option('--cache-path <string>')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl, cachePath } = cmd.opts();

    const cacheContent = loadCache(cacheName, env, cachePath);

    if (!cacheContent) {
      return log.error(
        `No cache found, can't continue. Make sure you are in the correct directory where the assets are located or use the --cache-path option.`,
      );
    }

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    try {
      const machine = await anchorProgram.account.candyMachine.fetch(
        cacheContent.program.candyMachine,
      );
      log.info('...Candy Machine...');
      log.info('Key:', cacheContent.program.candyMachine);
      //@ts-ignore
      log.info('authority: ', machine.authority.toBase58());
      //@ts-ignore
      log.info('wallet: ', machine.wallet.toBase58());
      //@ts-ignore
      log.info(
        'tokenMint: ',
        //@ts-ignore
        machine.tokenMint ? machine.tokenMint.toBase58() : null,
      );
      //@ts-ignore
      log.info('uuid: ', machine.data.uuid);
      //@ts-ignore
      log.info('price: ', machine.data.price.toNumber());
      //@ts-ignore
      log.info('itemsAvailable: ', machine.data.itemsAvailable.toNumber());
      //@ts-ignore
      log.info('itemsRedeemed: ', machine.itemsRedeemed.toNumber());
      log.info(
        'goLiveDate: ',
        //@ts-ignore
        machine.data.goLiveDate
          ? //@ts-ignore
            new Date(machine.data.goLiveDate * 1000)
          : 'N/A',
      );
      //@ts-ignore
      log.info('symbol: ', machine.data.symbol);
      //@ts-ignore
      log.info('sellerFeeBasisPoints: ', machine.data.sellerFeeBasisPoints);
      //@ts-ignore
      log.info('creators: ');
      //@ts-ignore
      machine.data.creators.map(c =>
        log.info(c.address.toBase58(), 'at', c.share, '%'),
      ),
        //@ts-ignore
        log.info('maxSupply: ', machine.data.maxSupply.toNumber());
      //@ts-ignore
      log.info('retainAuthority: ', machine.data.retainAuthority);
      //@ts-ignore
      log.info('isMutable: ', machine.data.isMutable);

      //@ts-ignore
      log.info('hidden settings: ', machine.data.hiddenSettings);
      if (machine.data.endSettings) {
        log.info('End settings: ');

        if (machine.data.endSettings.endSettingType.date) {
          //@ts-ignore
          log.info('End on', new Date(machine.data.endSettings.number * 1000));
        } else {
          log.info(
            'End when',
            machine.data.endSettings.number.toNumber(),
            'sold',
          );
        }
      } else {
        log.info('No end settings detected');
      }

      if (machine.data.gatekeeper) {
        log.info('Captcha settings:');
        log.info(
          'Gatekeeper:',
          machine.data.gatekeeper.gatekeeperNetwork.toBase58(),
        );
        log.info('Expires on use:', machine.data.gatekeeper.expireOnUse);
      } else {
        log.info('No captcha for this candy machine');
      }

      if (machine.data.whitelistMintSettings) {
        //@ts-ignore
        log.info('whitelist settings: ');
        //@ts-ignore
        log.info('Mint: ', machine.data.whitelistMintSettings.mint.toBase58());
        //@ts-ignore
        log.info('Mode: ', machine.data.whitelistMintSettings.mode);
        //@ts-ignore
        log.info('Presale: ', machine.data.whitelistMintSettings.presale);
        //@ts-ignore
        log.info(
          'Discounted Price: ',
          machine.data.whitelistMintSettings.discountPrice?.toNumber() || 'N/A',
        );
      } else {
        log.info('no whitelist settings');
      }
    } catch (e) {
      console.error(e);
      console.log('No machine found');
    }
  });

programCommand('update_candy_machine')
  .option(
    '-cp, --config-path <string>',
    'JSON file with candy machine settings',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .option('--new-authority <Pubkey>', 'New Authority. Base58-encoded')
  .action(async (directory, cmd) => {
    const { keypair, env, rpcUrl, configPath, newAuthority, cacheName } =
      cmd.opts();
    const cacheContent = loadCache(cacheName, env);

    const newAuthorityKey = newAuthority ? new PublicKey(newAuthority) : null;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    const candyMachine = new PublicKey(cacheContent.program.candyMachine);

    const candyMachineObj = await anchorProgram.account.candyMachine.fetch(
      candyMachine,
    );

    const {
      number,
      retainAuthority,
      mutable,
      price,
      splToken,
      treasuryWallet,
      gatekeeper,
      endSettings,
      hiddenSettings,
      whitelistMintSettings,
      goLiveDate,
      uuid,
    } = await getCandyMachineV2Config(walletKeyPair, anchorProgram, configPath);

    const newSettings = {
      itemsAvailable: number
        ? new anchor.BN(number)
        : candyMachineObj.data.itemsAvailable,
      uuid: uuid || candyMachineObj.data.uuid,
      symbol: candyMachineObj.data.symbol,
      sellerFeeBasisPoints: candyMachineObj.data.sellerFeeBasisPoints,
      isMutable: mutable,
      maxSupply: new anchor.BN(0),
      retainAuthority: retainAuthority,
      gatekeeper,
      goLiveDate,
      endSettings,
      price,
      whitelistMintSettings,
      hiddenSettings,
      creators: candyMachineObj.data.creators.map(creator => {
        return {
          address: new PublicKey(creator.address),
          verified: true,
          share: creator.share,
        };
      }),
    };

    const remainingAccounts = [];
    if (splToken) {
      remainingAccounts.push({
        pubkey: splToken,
        isSigner: false,
        isWritable: false,
      });
    }
    const tx = await anchorProgram.rpc.updateCandyMachine(newSettings, {
      accounts: {
        candyMachine,
        authority: walletKeyPair.publicKey,
        wallet: treasuryWallet,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    });

    cacheContent.startDate = goLiveDate;

    log.info('update_candy_machine finished', tx);

    if (newAuthorityKey) {
      const tx = await anchorProgram.rpc.updateAuthority(newAuthorityKey, {
        accounts: {
          candyMachine,
          authority: walletKeyPair.publicKey,
        },
      });

      cacheContent.authority = newAuthorityKey.toBase58();
      log.info(` - updated authority: ${newAuthorityKey.toBase58()}`);
      log.info('update_authority finished', tx);
    }

    saveCache(cacheName, env, cacheContent);
  });

programCommand('mint_one_token')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl } = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const candyMachine = new PublicKey(cacheContent.program.candyMachine);
    const tx = await mintV2(keypair, env, candyMachine, rpcUrl);

    log.info('mint_one_token finished', tx);
  });

programCommand('mint_multiple_tokens')
  .option('-n, --number <string>', 'Number of tokens')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (_, cmd) => {
    const { keypair, env, cacheName, number, rpcUrl } = cmd.opts();

    const NUMBER_OF_NFTS_TO_MINT = parseInt(number, 10);
    const cacheContent = loadCache(cacheName, env);
    const candyMachine = new PublicKey(cacheContent.program.candyMachine);

    log.info(`Minting ${NUMBER_OF_NFTS_TO_MINT} tokens...`);

    const mintToken = async index => {
      const tx = await mintV2(keypair, env, candyMachine, rpcUrl);
      log.info(`transaction ${index + 1} complete`, tx);

      if (index < NUMBER_OF_NFTS_TO_MINT - 1) {
        log.info('minting another token...');
        await mintToken(index + 1);
      }
    };

    await mintToken(0);

    log.info(`minted ${NUMBER_OF_NFTS_TO_MINT} tokens`);
    log.info('mint_multiple_tokens finished');
  });

programCommand('sign')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .option('-m, --metadata <string>', 'base58 metadata account id')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, rpcUrl, metadata } = cmd.opts();

    await signMetadata(metadata, keypair, env, rpcUrl);
  });

programCommand('sign_all')
  .option('-b, --batch-size <string>', 'Batch size', '10')
  .option('-d, --daemon', 'Run signing continuously', false)
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl, batchSize, daemon } = cmd.opts();
    const cacheContent = loadCache(cacheName, env);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);
    const candyAddress = cacheContent.program.candyMachine;

    const batchSizeParsed = parseInt(batchSize);
    if (!parseInt(batchSize)) {
      throw new Error('Batch size needs to be an integer!');
    }

    log.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
    log.debug('Environment: ', env);
    log.debug('Candy machine address: ', candyAddress);
    log.debug('Batch Size: ', batchSizeParsed);
    await signAllMetadataFromCandyMachine(
      anchorProgram.provider.connection,
      walletKeyPair,
      candyAddress,
      batchSizeParsed,
      daemon,
    );
  });

programCommand('update_existing_nfts_from_latest_cache_file')
  .option('-b, --batch-size <string>', 'Batch size', '2')
  .option('-nc, --new-cache <string>', 'Path to new updated cache file')
  .option('-d, --daemon', 'Run updating continuously', false)
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl, batchSize, daemon, newCache } =
      cmd.opts();
    const cacheContent = loadCache(cacheName, env);
    const newCacheContent = loadCache(newCache, env);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);
    const candyAddress = cacheContent.program.candyMachine;

    const batchSizeParsed = parseInt(batchSize);
    if (!parseInt(batchSize)) {
      throw new Error('Batch size needs to be an integer!');
    }

    log.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
    log.debug('Environment: ', env);
    log.debug('Candy machine address: ', candyAddress);
    log.debug('Batch Size: ', batchSizeParsed);
    await updateFromCache(
      anchorProgram.provider.connection,
      walletKeyPair,
      candyAddress,
      batchSizeParsed,
      daemon,
      cacheContent,
      newCacheContent,
    );
  });

// can then upload these
programCommand('randomize_unminted_nfts_in_new_cache_file').action(
  async (directory, cmd) => {
    const { keypair, env, cacheName } = cmd.opts();
    const cacheContent = loadCache(cacheName, env);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env);
    const candyAddress = cacheContent.program.candyMachine;

    log.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
    log.debug('Environment: ', env);
    log.debug('Candy machine address: ', candyAddress);

    const candyMachine = await anchorProgram.account.candyMachine.fetch(
      candyAddress,
    );

    const itemsRedeemed = candyMachine.itemsRedeemed;
    log.info('Randomizing one later than', itemsRedeemed.toNumber());
    const keys = Object.keys(cacheContent.items).filter(
      k => parseInt(k) > itemsRedeemed,
    );
    const shuffledKeys = shuffle(keys.slice());
    const newItems = {};
    for (let i = 0; i < keys.length; i++) {
      newItems[keys[i].toString()] =
        cacheContent.items[shuffledKeys[i].toString()];
      log.debug('Setting ', keys[i], 'to ', shuffledKeys[i]);
      newItems[keys[i].toString()].onChain = false;
    }
    fs.writeFileSync(
      '.cache/' + env + '-' + cacheName + '-randomized',
      JSON.stringify({
        ...cacheContent,
        items: { ...cacheContent.items, ...newItems },
      }),
    );
  },
);

programCommand('get_all_mint_addresses').action(async (directory, cmd) => {
  const { env, cacheName, keypair } = cmd.opts();

  const cacheContent = loadCache(cacheName, env);
  const walletKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgramV2(walletKeyPair, env);

  const accountsByCreatorAddress = await getAccountsByCreatorAddress(
    cacheContent.program.candyMachine,
    anchorProgram.provider.connection,
  );
  const addresses = accountsByCreatorAddress.map(it => {
    return new PublicKey(it[0].mint).toBase58();
  });

  console.log(JSON.stringify(addresses, null, 2));
});

programCommand('generate_art_configurations')
  .argument('<directory>', 'Directory containing traits named from 0-n', val =>
    fs.readdirSync(`${val}`),
  )
  .action(async (files: string[]) => {
    log.info('creating traits configuration file');
    const startMs = Date.now();
    const successful = await generateConfigurations(files);
    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    if (successful) {
      log.info('traits-configuration.json has been created!');
      log.info(
        `ended at: ${new Date(endMs).toISOString()}. time taken: ${timeTaken}`,
      );
    } else {
      log.info('The art configuration file was not created');
    }
  });

programCommand('create_generative_art')
  .option(
    '-n, --number-of-images <string>',
    'Number of images to be generated',
    '100',
  )
  .option(
    '-c, --config-location <string>',
    'Location of the traits configuration file',
    './traits-configuration.json',
  )
  .option(
    '-o, --output-location <string>',
    'If you wish to do image generation elsewhere, skip it and dump randomized sets to file',
  )
  .option(
    '-ta, --treat-attributes-as-file-names <string>',
    'If your attributes are filenames, trim the .png off if set to true',
  )
  .action(async (directory, cmd) => {
    const {
      numberOfImages,
      configLocation,
      outputLocation,
      treatAttributesAsFileNames,
    } = cmd.opts();

    log.info('Loaded configuration file');

    // 1. generate the metadata json files
    const randomSets = await createMetadataFiles(
      numberOfImages,
      configLocation,
      treatAttributesAsFileNames == 'true',
    );

    log.info('JSON files have been created within the assets directory');

    // 2. piecemeal generate the images
    if (!outputLocation) {
      await createGenerativeArt(configLocation, randomSets);
      log.info('Images have been created successfully!');
    } else {
      fs.writeFileSync(outputLocation, JSON.stringify(randomSets));

      log.info('Traits written!');
    }
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
  if (value === undefined || value === null) {
    return;
  }
  log.info('setting the log value to: ' + value);
  log.setLevel(value);
}

program.parse(process.argv);
