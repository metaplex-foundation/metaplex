import { program } from 'commander';
import log from 'loglevel';
import { mintNFT } from './commands/mint-nft';
import { loadWalletKey } from './helpers/accounts';
import { web3 } from '@project-serum/anchor';

program.version('0.0.1');
log.setLevel('info');

programCommand('mint')
  .option('-m, --metadata <string>', 'metadata url')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, metadata } = cmd.opts();
    const solConnection = new web3.Connection(web3.clusterApiUrl(env));
    const walletKeyPair = loadWalletKey(keypair);
    await mintNFT(solConnection, walletKeyPair, metadata);
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
