import { program } from 'commander';
import log from 'loglevel';
import { mintNFT, updateMetadata } from './commands/mint-nft';
import { loadWalletKey } from './helpers/accounts';
import { web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { getCluster } from './helpers/various';
program.version('0.0.1');
log.setLevel('info');

programCommand('mint')
  .option('-u, --url <string>', 'metadata url')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, url } = cmd.opts();
    const solConnection = new web3.Connection(getCluster(env));
    const walletKeyPair = loadWalletKey(keypair);
    await mintNFT(solConnection, walletKeyPair, url);
  });

programCommand('update-metadata')
  .option('-m, --mint <string>', 'base58 mint key')
  .option('-u, --url <string>', 'metadata url')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, url } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const solConnection = new web3.Connection(getCluster(env));
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
