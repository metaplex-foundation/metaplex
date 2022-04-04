#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { InvalidArgumentError, program } from 'commander';
import * as anchor from '@project-serum/anchor';

import {
  chunks,
  fromUTF8Array,
  getCandyMachineV2Config,
  parseCollectionMintPubkey,
  parsePrice,
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
  deriveCandyMachineV2ProgramAddress,
  getCollectionPDA,
} from './helpers/accounts';

import { uploadV2 } from './commands/upload';
import { verifyTokenMetadata } from './commands/verifyTokenMetadata';
import { loadCache, saveCache } from './helpers/cache';
import { mintV2 } from './commands/mint';
import { signMetadata } from './commands/sign';
import {
  getAddressesByCreatorAddress,
  signAllMetadataFromCandyMachine,
} from './commands/signAll';
import { getOwnersByMintAddresses } from './commands/owners';
import log from 'loglevel';
import { withdrawV2 } from './commands/withdraw';
import { updateFromCache } from './commands/updateFromCache';
import { StorageType } from './helpers/storage-type';
import { getType } from 'mime';
import { removeCollection } from './commands/remove-collection';
import { setCollection } from './commands/set-collection';
import { withdrawBundlr } from './helpers/upload/arweave-bundle';
import { CollectionData } from './types';

program.version('0.0.2');
const supportedImageTypes = {
  'image/png': 1,
  'image/gif': 1,
  'image/jpeg': 1,
};
const supportedAnimationTypes = {
  'video/mp4': 1,
  'video/quicktime': 1,
  'audio/mpeg': 1,
  'audio/x-flac': 1,
  'audio/wav': 1,
  'model/gltf-binary': 1,
  'text/html': 1,
};

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}
log.setLevel(log.levels.INFO);

// From commander examples
function myParseInt(value) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}

programCommand('version', { requireWallet: false }).action(async () => {
  const revision = require('child_process')
    .execSync('git rev-parse HEAD')
    .toString()
    .trim();
  log.info(`Candy Machine Version: ${revision}`);
});

programCommand('upload')
  .argument(
    '<directory>',
    'Directory containing images named from 0-n',
    val => {
      return fs.readdirSync(`${val}`).map(file => path.join(val, file));
    },
  )
  .requiredOption(
    '-cp, --config-path <string>',
    'JSON file with candy machine settings',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .option(
    '-rl, --rate-limit <number>',
    'max number of concurrent requests for the write indices command',
    myParseInt,
    5,
  )
  .option(
    '-m, --collection-mint <string>',
    'optional collection mint ID. Will be randomly generated if not provided',
  )
  .option(
    '-nc, --no-set-collection-mint',
    'optional flag to prevent the candy machine from using an on chain collection',
  )
  .action(async (files: string[], options, cmd) => {
    const {
      keypair,
      env,
      cacheName,
      configPath,
      rpcUrl,
      rateLimit,
      collectionMint,
      setCollectionMint,
    } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);

    const {
      storage,
      nftStorageKey,
      ipfsInfuraProjectId,
      number,
      ipfsInfuraSecret,
      pinataJwt,
      pinataGateway,
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
      log.info(
        '\x1b[31m%s\x1b[0m',
        'WARNING: On Devnet, the arweave-sol storage option only stores your files for 1 week. Please upload via Mainnet Beta for your final collection.\n',
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

    let imageFileCount = 0;
    let animationFileCount = 0;
    let jsonFileCount = 0;

    // Filter out any non-supported file types and find the JSON vs Image file count
    const supportedFiles = files.filter(it => {
      if (supportedImageTypes[getType(it)]) {
        imageFileCount++;
      } else if (supportedAnimationTypes[getType(it)]) {
        animationFileCount++;
      } else if (it.endsWith(EXTENSION_JSON)) {
        jsonFileCount++;
      } else {
        log.warn(`WARNING: Skipping unsupported file type ${it}`);
        return false;
      }

      return true;
    });

    if (animationFileCount !== 0 && storage === StorageType.Arweave) {
      throw new Error(
        'The "arweave" storage option is incompatible with animation files. Please try again with another storage option using `--storage <option>`.',
      );
    }

    if (animationFileCount !== 0 && animationFileCount !== jsonFileCount) {
      throw new Error(
        `number of animation files (${animationFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    } else if (imageFileCount !== jsonFileCount) {
      throw new Error(
        `number of img files (${imageFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    }

    const elemCount = number ? number : imageFileCount;
    if (elemCount < imageFileCount) {
      throw new Error(
        `max number (${elemCount}) cannot be smaller than the number of images in the source folder (${imageFileCount})`,
      );
    }

    if (animationFileCount === 0) {
      log.info(`Beginning the upload for ${elemCount} (img+json) pairs`);
    } else {
      log.info(
        `Beginning the upload for ${elemCount} (img+animation+json) sets`,
      );
    }

    const collectionMintPubkey = await parseCollectionMintPubkey(
      collectionMint,
      anchorProgram.provider.connection,
      walletKeyPair,
    );

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    try {
      await uploadV2({
        files: supportedFiles,
        cacheName,
        env,
        totalNFTs: elemCount,
        gatekeeper,
        storage,
        retainAuthority,
        mutable,
        nftStorageKey,
        ipfsCredentials,
        pinataJwt,
        pinataGateway,
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
        rateLimit,
        collectionMintPubkey,
        setCollectionMint,
        rpcUrl,
      });
    } catch (err) {
      log.warn('upload was not successful, please re-run.', err);
      process.exit(1);
    }
    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    log.info(
      `ended at: ${new Date(endMs).toISOString()}. time taken: ${timeTaken}`,
    );
    process.exit(0);
  });

programCommand('withdraw')
  .argument('<candy_machine_id>', 'Candy machine id')
  .option('-d, --dry', 'Show Candy Machine withdraw amount without withdrawing')
  .option('-ch, --charity <string>', 'Which charity?', '')
  .option('-cp, --charityPercent <string>', 'Which percent to charity?', '0')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (candyMachineId, _, cmd) => {
    const { keypair, env, dry, charity, charityPercent, rpcUrl } = cmd.opts();

    if (charityPercent < 0 || charityPercent > 100) {
      log.error('Charity percentage needs to be between 0 and 100');
      return;
    }
    const walletKeypair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeypair, env, rpcUrl);
    const configOrCommitment = {
      commitment: 'confirmed',
      filters: [
        {
          memcmp: {
            offset: 8,
            bytes: walletKeypair.publicKey.toBase58(),
          },
        },
      ],
    };
    const machines: AccountAndPubkey[] = await getProgramAccounts(
      anchorProgram.provider.connection,
      CANDY_MACHINE_PROGRAM_V2_ID.toBase58(),
      configOrCommitment,
    );
    const currentMachine = machines?.find(machine => {
      return machine.pubkey === candyMachineId;
    });

    if (!currentMachine) {
      log.error(`Candy Machine ${candyMachineId} not found`);
      return;
    }

    const refundAmount = currentMachine.account.lamports / LAMPORTS_PER_SOL;
    const cpf = parseFloat(charityPercent);
    let charityPub;
    log.info(`Amount to be drained from ${candyMachineId}: ${refundAmount}`);
    if (!!charity && charityPercent > 0) {
      const donation = refundAmount * (100 / charityPercent);
      charityPub = new PublicKey(charity);
      log.info(
        `Of that ${refundAmount}, ${donation} will be donated to ${charity}. Thank you!`,
      );
    }

    if (!dry) {
      const errors = [];
      log.info(
        `WARNING: This command will drain the SOL from Candy Machine ${candyMachineId}. This will break your Candy Machine if its still in use`,
      );
      try {
        if (currentMachine.account.lamports > 0) {
          const tx = await withdrawV2(
            anchorProgram,
            walletKeypair,
            env,
            new PublicKey(candyMachineId),
            currentMachine.account.lamports,
            charityPub,
            cpf,
          );
          log.info(
            `${candyMachineId} has been withdrawn. \nTransaction Signature: ${tx}`,
          );
        }
      } catch (e) {
        log.error(`Withdraw has failed for ${candyMachineId}`, e.message);
        errors.push(e);
        return;
      }
      log.info(
        `Congratulations, ${candyMachineId} has been successfuly drained! Please consider support Open Source developers`,
      );
    }
  });

programCommand('withdraw_all')
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
              `${cg.pubkey} has been withdrawn. \nTransaction Signature: ${tx}`,
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

programCommand('withdraw_bundlr').action(async (_, cmd) => {
  const { keypair } = cmd.opts();
  const walletKeyPair = loadWalletKey(keypair);
  await withdrawBundlr(walletKeyPair);
});

program
  .command('verify_assets')
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

programCommand('verify_upload')
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

    const keys = Object.keys(cacheContent.items)
      .filter(k => !cacheContent.items[k].verifyRun)
      .sort((a, b) => Number(a) - Number(b));

    if (keys.length > 0) {
      log.info(`Checking ${keys.length} items that have yet to be checked...`);
    }
    await Promise.all(
      chunks(keys, 500).map(async allIndexesInSlice => {
        for (let i = 0; i < allIndexesInSlice.length; i++) {
          // Save frequently.
          if (i % 100 == 0) saveCache(cacheName, env, cacheContent);

          const key = allIndexesInSlice[i];
          log.info('Looking at key ', key);

          const thisSlice = candyMachine.data.slice(
            CONFIG_ARRAY_START_V2 + 4 + CONFIG_LINE_SIZE_V2 * key,
            CONFIG_ARRAY_START_V2 + 4 + CONFIG_LINE_SIZE_V2 * (key + 1),
          );

          const name = fromUTF8Array([
            ...thisSlice.slice(4, 36).filter(n => n !== 0),
          ]);
          const uri = fromUTF8Array([
            ...thisSlice.slice(40, 240).filter(n => n !== 0),
          ]);
          const cacheItem = cacheContent.items[key];

          if (name != cacheItem.name || uri != cacheItem.link) {
            log.debug(
              `Name (${name}) or uri (${uri}) didnt match cache values of (${cacheItem.name})` +
                `and (${cacheItem.link}). marking to rerun for image`,
              key,
            );
            cacheItem.onChain = false;
            allGood = false;
          } else {
            cacheItem.verifyRun = true;
          }
        }
      }),
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
  .requiredOption('-p, --price <string>')
  .option('--cache-path <string>')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, price, cacheName, rpcUrl, cachePath } = cmd.opts();
    const lamports = parsePrice(price);

    if (isNaN(lamports)) {
      return log.error(`verify_price requires a valid --price to be set`);
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
  .option(
    '-cm, --candy-machine-address <string>',
    'Optional candy machine address to replace the cache path',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl, cachePath, candyMachineAddress } =
      cmd.opts();

    const cacheContent = candyMachineAddress
      ? { program: { candyMachine: candyMachineAddress } }
      : loadCache(cacheName, env, cachePath);

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
      const [candyMachineAddr] = await deriveCandyMachineV2ProgramAddress(
        new PublicKey(cacheContent.program.candyMachine),
      );
      const [collectionPDAPubkey] = await getCollectionPDA(
        new PublicKey(cacheContent.program.candyMachine),
      );
      let collectionData: null | CollectionData = null;
      const collectionPDAAccount =
        await anchorProgram.provider.connection.getAccountInfo(
          collectionPDAPubkey,
        );
      if (collectionPDAAccount) {
        collectionData = (await anchorProgram.account.collectionPda.fetch(
          collectionPDAPubkey,
        )) as CollectionData;
      }
      log.info('...Candy Machine...');
      log.info('Key:', cacheContent.program.candyMachine);
      log.info('1st creator :', candyMachineAddr.toBase58());
      //@ts-ignore
      log.info('authority: ', machine.authority.toBase58());
      //@ts-ignore
      log.info('wallet: ', machine.wallet.toBase58());
      if (collectionPDAAccount) {
        log.info('Collection mint: ', collectionData?.mint.toBase58());
        log.info('Collection PDA: ', collectionPDAPubkey.toBase58());
      }
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
      log.error(e);
      log.error('No machine found');
    }
  });

programCommand('update_candy_machine')
  .requiredOption(
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
          wallet: treasuryWallet,
        },
      });

      cacheContent.authority = newAuthorityKey.toBase58();
      log.info(` - updated authority: ${newAuthorityKey.toBase58()}`);
      log.info('update_authority finished', tx);
    }

    saveCache(cacheName, env, cacheContent);
  });

programCommand('set_collection')
  .option(
    '-m, --collection-mint <string>',
    'optional collection mint ID. Will be randomly generated if not provided',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl, collectionMint } = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const candyMachine = new PublicKey(cacheContent.program.candyMachine);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);
    const collectionMintPubkey = await parseCollectionMintPubkey(
      collectionMint,
      anchorProgram.provider.connection,
      walletKeyPair,
    );
    const tx = await setCollection(
      walletKeyPair,
      anchorProgram,
      candyMachine,
      collectionMintPubkey,
    );

    log.info('set collection finished', tx);
  });

programCommand('remove_collection')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, cacheName, rpcUrl } = cmd.opts();

    const cacheContent = loadCache(cacheName, env);
    const candyMachine = new PublicKey(cacheContent.program.candyMachine);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgramV2(walletKeyPair, env, rpcUrl);
    const tx = await removeCollection(
      walletKeyPair,
      anchorProgram,
      candyMachine,
    );

    log.info('remove collection finished', tx);
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
  .requiredOption('-n, --number <string>', 'Number of tokens')
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
  .requiredOption('-m, --metadata <string>', 'base58 metadata account id')
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

    const batchSizeParsed = parseInt(batchSize);
    if (!parseInt(batchSize)) {
      throw new Error('Batch size needs to be an integer!');
    }

    const candyMachineId = new PublicKey(cacheContent.program.candyMachine);
    const [candyMachineAddr] = await deriveCandyMachineV2ProgramAddress(
      candyMachineId,
    );

    log.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
    log.debug('Environment: ', env);
    log.debug('Candy machine address: ', cacheContent.program.candyMachine);
    log.debug('Batch Size: ', batchSizeParsed);
    await signAllMetadataFromCandyMachine(
      anchorProgram.provider.connection,
      walletKeyPair,
      candyMachineAddr.toBase58(),
      batchSizeParsed,
      daemon,
    );
  });

programCommand('update_existing_nfts_from_latest_cache_file')
  .option('-b, --batch-size <string>', 'Batch size', '2')
  .option('-nc, --new-cache <string>', 'New cache file name')
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

programCommand('get_all_mint_addresses').action(async (directory, cmd) => {
  const { env, cacheName, keypair } = cmd.opts();

  const cacheContent = loadCache(cacheName, env);
  const walletKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgramV2(walletKeyPair, env);

  const candyMachineId = new PublicKey(cacheContent.program.candyMachine);
  const [candyMachineAddr] = await deriveCandyMachineV2ProgramAddress(
    candyMachineId,
  );

  log.info('Getting mint addresses...');
  const addresses = await getAddressesByCreatorAddress(
    candyMachineAddr.toBase58(),
    anchorProgram.provider.connection,
  );
  fs.writeFileSync('./mint-addresses.json', JSON.stringify(addresses, null, 2));
  log.info('Successfully saved mint addresses to mint-addresses.json');
});

programCommand('get_all_owners_addresses').action(async (directory, cmd) => {
  const { env, cacheName, keypair } = cmd.opts();

  const cacheContent = loadCache(cacheName, env);
  const walletKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgramV2(walletKeyPair, env);

  const candyMachineId = new PublicKey(cacheContent.program.candyMachine);
  const [candyMachineAddr] = await deriveCandyMachineV2ProgramAddress(
    candyMachineId,
  );

  log.info('Getting mint addresses...');
  const addresses = await getAddressesByCreatorAddress(
    candyMachineAddr.toBase58(),
    anchorProgram.provider.connection,
  );

  log.info('Getting owner addresses...');
  const owners = await getOwnersByMintAddresses(
    addresses,
    anchorProgram.provider.connection,
  );
  fs.writeFileSync('./owner-addresses.json', JSON.stringify(owners, null, 2));
  log.info('Successfully saved owner addresses to owner-addresses.json');
});

programCommand('get_unminted_tokens').action(async (directory, cmd) => {
  const { keypair, env, cacheName } = cmd.opts();
  const cacheContent = loadCache(cacheName, env);
  const walletKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgramV2(walletKeyPair, env);
  const candyAddress = cacheContent.program.candyMachine;

  log.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
  log.debug('Environment: ', env);
  log.debug('Candy machine address: ', candyAddress);

  const itemsAvailable = Object.keys(cacheContent.items).length;

  const candyMachine = await anchorProgram.provider.connection.getAccountInfo(
    new anchor.web3.PublicKey(candyAddress),
  );

  const thisSlice = candyMachine.data.slice(
    CONFIG_ARRAY_START_V2 +
      4 +
      CONFIG_LINE_SIZE_V2 * itemsAvailable +
      4 +
      Math.floor(itemsAvailable / 8) +
      4,
    candyMachine.data.length,
  );

  let index = 0;
  const unminted = {};

  for (let i = 0; i < thisSlice.length; i++) {
    const start = 1 << 7;
    for (let j = 0; j < 8 && index < itemsAvailable; j++) {
      if (!(thisSlice[i] & (start >> j))) {
        unminted[index.toString()] = cacheContent.items[index.toString()];
        log.debug('Unminted token index', index);
      }
      index++;
    }
  }

  const found = Object.keys(unminted).length;

  if (found > 0) {
    fs.writeFileSync(
      './unminted-tokens.json',
      JSON.stringify(unminted, null, 2),
    );
    log.info(
      `Done - successfully saved ${found} unminted token(s) information to 'unminted-tokens.json' file`,
    );
  } else {
    log.info('Nothing to do - all tokens have been minted');
  }
});

function programCommand(
  name: string,
  options: { requireWallet: boolean } = { requireWallet: true },
) {
  let cmProgram = program
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'devnet', //mainnet-beta, testnet, devnet
    )
    .option('-l, --log-level <string>', 'log level', setLogLevel)
    .option('-c, --cache-name <string>', 'Cache file name', 'temp');

  if (options.requireWallet) {
    cmProgram = cmProgram.requiredOption(
      '-k, --keypair <path>',
      `Solana wallet location`,
    );
  }

  return cmProgram;
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
