import { program } from 'commander';
import * as fs from 'fs';
import log from 'loglevel';
import { getType } from 'mime';
import * as path from 'path';
import { uploadBundle } from './commands/upload-bundle';
import { loadWalletKey } from './helpers/accounts';
import { CACHE_PATH, EXTENSION_JSON } from './helpers/constants';

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

programCommand('upload_bundle')
  .argument('<directory>', 'Directory containing assets', val => {
    return fs.readdirSync(`${val}`).map(file => path.join(val, file));
  })
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (files: string[], options, cmd) => {
    const { keypair, env, cacheName, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);

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

    if (animationFileCount !== 0 && animationFileCount !== jsonFileCount) {
      throw new Error(
        `number of animation files (${animationFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    } else if (imageFileCount !== 0 && imageFileCount !== jsonFileCount) {
      throw new Error(
        `number of img files (${imageFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    }

    const elemCount = jsonFileCount;

    if (imageFileCount === 0 && animationFileCount === 0) {
      log.info(`Beginning the upload for {${elemCount} (json) pairs`);
    } else if (animationFileCount === 0) {
      log.info(`Beginning the upload for ${elemCount} (img+json) sets`);
    } else {
      log.info(
        `Beginning the upload for ${elemCount} (img+animation+json) sets`,
      );
    }

    const startMs = Date.now();
    log.info('started at: ' + startMs.toString());
    try {
      await uploadBundle({
        files: supportedFiles,
        cacheName,
        env,
        totalNFTs: elemCount,
        walletKeyPair,
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
