import { web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { program } from 'commander';
import * as fs from 'fs';
import log from 'loglevel';
import {
  createMetadata,
  createMetadataAccount,
  mintNFT,
  updateMetadata,
  validateMetadata,
} from './commands/mint-nft';
import { loadWalletKey } from './helpers/accounts';
import { Data } from './helpers/schema';

program.version('0.0.1');
log.setLevel('info');

programCommand('mint')
  .option('-u, --url <string>', 'metadata url')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, url } = cmd.opts();
    const solConnection = new web3.Connection(web3.clusterApiUrl(env));
    const walletKeyPair = loadWalletKey(keypair);
    await mintNFT(solConnection, walletKeyPair, url);
  });

programCommand('create-metadata')
  .option('-m, --mint <string>', 'base58 mint key')
  .option('-u, --url <string>', 'metadata url')
  .option('-f, --file <string>', 'local file')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, url, file } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const connection = new web3.Connection(web3.clusterApiUrl(env));
    const walletKeypair = loadWalletKey(keypair);

    let data: Data;

    if (url) {
      data = await createMetadata(url);
      if (!data) {
        log.error('No metadata found at URL.');
        return;
      }
    } else if (file) {
      const fileData = JSON.parse(fs.readFileSync(file).toString());
      log.info('Read from file', fileData);
      data = validateMetadata({ metadata: fileData, uri: '' });
    } else {
      log.error('No metadata source provided.');
      return;
    }

    if (!data) {
      log.error('Metadata not constructed.');
      return;
    }

    await createMetadataAccount({
      connection,
      data,
      mintKey,
      walletKeypair,
    });
  });

programCommand('update-metadata')
  .option('-m, --mint <string>', 'base58 mint key')
  .option('-u, --url <string>', 'metadata url')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, url } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const solConnection = new web3.Connection(web3.clusterApiUrl(env));
    const walletKeyPair = loadWalletKey(keypair);
    await updateMetadata(mintKey, solConnection, walletKeyPair, url);
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

program.parse(process.argv);
