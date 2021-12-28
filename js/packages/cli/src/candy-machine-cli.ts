#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import fetch from 'node-fetch';

import {
  chunks,
  fromUTF8Array,
  parseDate,
  parsePrice,
  shuffle,
} from './helpers/various';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  CACHE_PATH,
  CONFIG_ARRAY_START,
  CONFIG_LINE_SIZE,
  EXTENSION_JSON,
  CANDY_MACHINE_PROGRAM_ID,
} from './helpers/constants';
import {
  getBalance,
  getCandyMachineAddress,
  getProgramAccounts,
  loadCandyProgram,
  loadWalletKey,
  AccountAndPubkey,
} from './helpers/accounts';
import { Config } from './types';
import { upload } from './commands/upload';
import { updateFromCache } from './commands/updateFromCache';
import { verifyTokenMetadata } from './commands/verifyTokenMetadata';
import { generateConfigurations } from './commands/generateConfigurations';
import { loadCache, saveCache } from './helpers/cache';
import { mint } from './commands/mint';
import { signMetadata } from './commands/sign';
import {
  getAccountsByCreatorAddress,
  signAllMetadataFromCandyMachine,
} from './commands/signAll';
import log from 'loglevel';
import { createMetadataFiles } from './helpers/metadata';
import { createGenerativeArt } from './commands/createArt';
import { withdraw } from './commands/withdraw';
import { StorageType } from './helpers/storage-type';
import { getType } from 'mime';
const supportedImageTypes = {
  'image/png': 1,
  'image/gif': 1,
  'image/jpeg': 1,
};
program.version('0.0.2');

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

  .option(
    '-b, --batchSize <number>',
    'Batch size - defaults to 50. Has no Affect on Bundlr',
    '50',
  )
  .option(
    '-s, --storage <string>',
    `Database to use for storage (${Object.values(StorageType).join(', ')})`,
    'arweave',
  )
  .option(
    '--ipfs-infura-project-id <string>',
    'Infura IPFS project id (required if using IPFS)',
  )
  .option(
    '--ipfs-infura-secret <string>',
    'Infura IPFS scret key (required if using IPFS)',
  )
  .option(
    '--aws-s3-bucket <string>',
    '(existing) AWS S3 Bucket name (required if using aws)',
  )
  .option(
    '--arweave-jwk <string>',
    'Path to Arweave wallet file (required if using Arweave Bundles (--storage arweave-bundle)',
  )
  .option('--no-retain-authority', 'Do not retain authority to update metadata')
  .option('--no-mutable', 'Metadata will not be editable')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (files: string[], options, cmd) => {
    const {
      number,
      keypair,
      env,
      cacheName,
      storage,
      ipfsInfuraProjectId,
      ipfsInfuraSecret,
      awsS3Bucket,
      retainAuthority,
      mutable,
      rpcUrl,
      arweaveJwk,
      batchSize,
    } = cmd.opts();

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

    const parsedNumber = parseInt(number);
    const elemCount = parsedNumber ? parsedNumber : imageFileCount;

    if (imageFileCount !== jsonFileCount) {
      throw new Error(
        `number of image files (${imageFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    }

    if (elemCount < imageFileCount) {
      throw new Error(
        `max number (${elemCount})cannot be smaller than the number of elements in the source folder (${imageFileCount})`,
      );
    }

    log.info(`Beginning the upload for ${elemCount} (image+json) pairs`);

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    try {
      await upload({
        files,
        cacheName,
        env,
        keypair,
        totalNFTs: elemCount,
        storage,
        retainAuthority,
        mutable,
        rpcUrl,
        ipfsCredentials,
        awsS3Bucket,
        arweaveJwk,
        batchSize,
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
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

    // this is hash of first 8 symbols in pubkey
    // account:Config
    const hashConfig = [155, 12, 170, 224, 30, 250, 204, 130];
    const configOrCommitment = {
      commitment: 'confirmed',
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: hashConfig,
          },
        },
        {
          memcmp: {
            offset: 8,
            bytes: walletKeyPair.publicKey.toBase58(),
          },
        },
      ],
    };
    const configs: AccountAndPubkey[] = await getProgramAccounts(
      anchorProgram.provider.connection,
      CANDY_MACHINE_PROGRAM_ID.toBase58(),
      configOrCommitment,
    );
    let t = 0;
    for (const cg in configs) {
      t += configs[cg].account.lamports;
    }
    const totalValue = t / LAMPORTS_PER_SOL;
    const cpf = parseFloat(charityPercent);
    let charityPub;
    log.info(
      `Total Number of Candy Machine Config Accounts to drain ${configs.length}`,
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
      for (const cg of configs) {
        try {
          if (cg.account.lamports > 0) {
            const tx = await withdraw(
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
      const successCount = configs.length - errors.length;
      const richness =
        successCount === configs.length ? 'rich again' : 'kinda rich';
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
    log.info(
      `\n==> Starting verification: ${
        new Date(startMs).toString().split(' G')[0]
      }`,
    );
    verifyTokenMetadata({ files, uploadElementsCount: number });

    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    log.info(
      `==> Verification ended: ${new Date(endMs).toString().split(' G')[0]}`,
    );
    log.info(`Elapsed time: ${timeTaken}\n`);
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
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

    const configAddress = new PublicKey(cacheContent.program.config);
    const config = await anchorProgram.provider.connection.getAccountInfo(
      configAddress,
    );
    let allGood = true;

    const keys = Object.keys(cacheContent.items);
    await Promise.all(
      chunks(Array.from(Array(keys.length).keys()), 500).map(
        async allIndexesInSlice => {
          for (let i = 0; i < allIndexesInSlice.length; i++) {
            const key = keys[allIndexesInSlice[i]];
            log.debug('Looking at key ', allIndexesInSlice[i]);

            const thisSlice = config.data.slice(
              CONFIG_ARRAY_START + 4 + CONFIG_LINE_SIZE * allIndexesInSlice[i],
              CONFIG_ARRAY_START +
                4 +
                CONFIG_LINE_SIZE * (allIndexesInSlice[i] + 1),
            );
            const name = fromUTF8Array([...thisSlice.slice(4, 36)]);
            const uri = fromUTF8Array([...thisSlice.slice(40, 240)]);
            const cacheItem = cacheContent.items[key];
            if (!name.match(cacheItem.name) || !uri.match(cacheItem.link)) {
              //leaving here for debugging reasons, but it's pretty useless. if the first upload fails - all others are wrong
              // log.info(
              //   `Name (${name}) or uri (${uri}) didnt match cache values of (${cacheItem.name})` +
              //   `and (${cacheItem.link}). marking to rerun for image`,
              //   key,
              // );
              cacheItem.onChain = false;
              allGood = false;
            } else {
              let json;
              try {
                json = await fetch(cacheItem.link);
              } catch (e) {
                json = { status: 404 };
              }
              if (
                json.status == 200 ||
                json.status == 204 ||
                json.status == 202
              ) {
                const body = await json.text();
                const parsed = JSON.parse(body);
                if (parsed.image) {
                  let check;
                  try {
                    check = await fetch(parsed.image);
                  } catch (e) {
                    check = { status: 404 };
                  }
                  if (
                    check.status == 200 ||
                    check.status == 204 ||
                    check.status == 202
                  ) {
                    const text = await check.text();
                    if (!text.match(/Not found/i)) {
                      if (text.length == 0) {
                        log.info(
                          'Name',
                          name,
                          'with',
                          uri,
                          'has zero length, failing',
                        );
                        cacheItem.link = null;
                        cacheItem.onChain = false;
                        allGood = false;
                      } else {
                        log.info('Name', name, 'with', uri, 'checked out');
                      }
                    } else {
                      log.info(
                        'Name',
                        name,
                        'with',
                        uri,
                        'never got uploaded to arweave, failing',
                      );
                      cacheItem.link = null;
                      cacheItem.onChain = false;
                      allGood = false;
                    }
                  } else {
                    log.info(
                      'Name',
                      name,
                      'with',
                      uri,
                      'returned non-200 from uploader',
                      check.status,
                    );
                    cacheItem.link = null;
                    cacheItem.onChain = false;
                    allGood = false;
                  }
                } else {
                  log.info(
                    'Name',
                    name,
                    'with',
                    uri,
                    'lacked image in json, failing',
                  );
                  cacheItem.link = null;
                  cacheItem.onChain = false;
                  allGood = false;
                }
              } else {
                log.info(
                  'Name',
                  name,
                  'with',
                  uri,
                  'returned no json from link',
                );
                cacheItem.link = null;
                cacheItem.onChain = false;
                allGood = false;
              }
            }
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

    const configData = (await anchorProgram.account.config.fetch(
      configAddress,
    )) as Config;

    const lineCount = new anchor.BN(
      config.data.slice(247, 247 + 4),
      undefined,
      'le',
    );

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
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

    const candyAddress = new PublicKey(cacheContent.candyMachineAddress);

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
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

    const [candyMachine] = await getCandyMachineAddress(
      new PublicKey(cacheContent.program.config),
      cacheContent.program.uuid,
    );

    try {
      const machine = await anchorProgram.account.candyMachine.fetch(
        candyMachine,
      );
      log.info('...Candy Machine...');
      log.info('Key:', candyMachine.toBase58());
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
      log.info('config: ', machine.config.toBase58());
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
    } catch (e) {
      console.log('No machine found');
    }

    const config = await anchorProgram.account.config.fetch(
      cacheContent.program.config,
    );
    log.info('...Config...');
    //@ts-ignore
    log.info('authority: ', config.authority.toBase58());
    //@ts-ignore
    log.info('symbol: ', config.data.symbol);
    //@ts-ignore
    log.info('sellerFeeBasisPoints: ', config.data.sellerFeeBasisPoints);
    //@ts-ignore
    log.info('creators: ');
    //@ts-ignore
    config.data.creators.map(c =>
      log.info(c.address.toBase58(), 'at', c.share, '%'),
    ),
      //@ts-ignore
      log.info('maxSupply: ', config.data.maxSupply.toNumber());
    //@ts-ignore
    log.info('retainAuthority: ', config.data.retainAuthority);
    //@ts-ignore
    log.info('isMutable: ', config.data.isMutable);
    //@ts-ignore
    log.info('maxNumberOfLines: ', config.data.maxNumberOfLines);
  });

programCommand('create_candy_machine')
  .option(
    '-p, --price <string>',
    'Price denominated in SOL or spl-token override',
    '1',
  )
  .option(
    '-t, --spl-token <string>',
    'SPL token used to price NFT mint. To use SOL leave this empty.',
  )
  .option(
    '-a, --spl-token-account <string>',
    'SPL token account that receives mint payments. Only required if spl-token is specified.',
  )
  .option(
    '-s, --sol-treasury-account <string>',
    'SOL account that receives mint payments. Should have minimum 0.1 sol balance',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      price,
      cacheName,
      splToken,
      splTokenAccount,
      solTreasuryAccount,
      rpcUrl,
    } = cmd.opts();

    let parsedPrice = parsePrice(price);
    const cacheContent = loadCache(cacheName, env);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

    let wallet = walletKeyPair.publicKey;
    const remainingAccounts = [];
    if (splToken || splTokenAccount) {
      if (solTreasuryAccount) {
        throw new Error(
          'If spl-token-account or spl-token is set then sol-treasury-account cannot be set',
        );
      }
      if (!splToken) {
        throw new Error(
          'If spl-token-account is set, spl-token must also be set',
        );
      }
      const splTokenKey = new PublicKey(splToken);
      const splTokenAccountKey = new PublicKey(splTokenAccount);
      if (!splTokenAccount) {
        throw new Error(
          'If spl-token is set, spl-token-account must also be set',
        );
      }

      const token = new Token(
        anchorProgram.provider.connection,
        splTokenKey,
        TOKEN_PROGRAM_ID,
        walletKeyPair,
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
        throw new Error(
          `The spl-token-account's mint (${tokenAccount.mint.toString()}) does not match specified spl-token ${splTokenKey.toString()}`,
        );
      }

      wallet = splTokenAccountKey;
      parsedPrice = parsePrice(price, 10 ** mintInfo.decimals);
      remainingAccounts.push({
        pubkey: splTokenKey,
        isWritable: false,
        isSigner: false,
      });
    }

    if (solTreasuryAccount) {
      const treasuryAccount = new PublicKey(solTreasuryAccount);
      const treasuryBalance = await getBalance(treasuryAccount, env, rpcUrl);
      if (treasuryBalance === 0) {
        throw new Error(`Cannot use treasury account with 0 balance!`);
      }
      wallet = treasuryAccount;
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
    cacheContent.candyMachineAddress = candyMachine.toBase58();
    saveCache(cacheName, env, cacheContent);
    log.info(
      `create_candy_machine finished. candy machine pubkey: ${candyMachine.toBase58()}`,
    );
  });

programCommand('update_candy_machine')
  .option(
    '-d, --date <string>',
    'timestamp - eg "04 Dec 1995 00:12:00 GMT" or "now"',
  )
  .option('-p, --price <string>', 'SOL price')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .option('--new-authority <Pubkey>', 'New Authority. Base58-encoded')
  .action(async (directory, cmd) => {
    const { keypair, env, date, rpcUrl, price, newAuthority, cacheName } =
      cmd.opts();
    const cacheContent = loadCache(cacheName, env);

    const secondsSinceEpoch = date ? parseDate(date) : null;
    const lamports = price ? parsePrice(price) : null;
    const newAuthorityKey = newAuthority ? new PublicKey(newAuthority) : null;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);

    const candyMachine = new PublicKey(cacheContent.candyMachineAddress);

    if (lamports || secondsSinceEpoch) {
      const tx = await anchorProgram.rpc.updateCandyMachine(
        lamports ? new anchor.BN(lamports) : null,
        secondsSinceEpoch ? new anchor.BN(secondsSinceEpoch) : null,
        {
          accounts: {
            candyMachine,
            authority: walletKeyPair.publicKey,
          },
        },
      );

      cacheContent.startDate = secondsSinceEpoch;
      if (date)
        log.info(
          ` - updated startDate timestamp: ${secondsSinceEpoch} (${date})`,
        );
      if (lamports)
        log.info(` - updated price: ${lamports} lamports (${price} SOL)`);
      log.info('update_candy_machine finished', tx);
    }

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
    const configAddress = new PublicKey(cacheContent.program.config);
    const tx = await mint(
      keypair,
      env,
      configAddress,
      cacheContent.program.uuid,
      rpcUrl,
    );

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
    const configAddress = new PublicKey(cacheContent.program.config);

    log.info(`Minting ${NUMBER_OF_NFTS_TO_MINT} tokens...`);

    const mintToken = async index => {
      const tx = await mint(
        keypair,
        env,
        configAddress,
        cacheContent.program.uuid,
        rpcUrl,
      );
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
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);
    const candyAddress = cacheContent.candyMachineAddress;

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
    const anchorProgram = await loadCandyProgram(walletKeyPair, env, rpcUrl);
    const candyAddress = cacheContent.candyMachineAddress;

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
    const anchorProgram = await loadCandyProgram(walletKeyPair, env);
    const candyAddress = cacheContent.candyMachineAddress;

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
  const anchorProgram = await loadCandyProgram(walletKeyPair, env);

  const accountsByCreatorAddress = await getAccountsByCreatorAddress(
    cacheContent.candyMachineAddress,
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
function errorColor(str) {
  // Add ANSI escape codes to display text in red.
  return `\x1b[31m${str}\x1b[0m`;
}
program
  .configureOutput({
    // Visibly override write routines as example!
    writeOut: str => process.stdout.write(`[OUT] ${str}`),
    writeErr: str => process.stdout.write(`[ERR] ${str}`),
    // Highlight errors in color.
    outputError: (str, write) => write(errorColor(str)),
  })
  .parse(process.argv);
