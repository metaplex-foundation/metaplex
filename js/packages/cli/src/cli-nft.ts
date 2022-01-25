import { program } from 'commander';
import log from 'loglevel';
import { mintNFT, updateMetadata, verifyCollection } from './commands/mint-nft';
import { getMetadata, loadWalletKey } from './helpers/accounts';
import { parseUses } from './helpers/various';
import { web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { getCluster } from './helpers/various';
import { MetadataData } from '@metaplex-foundation/mpl-token-metadata';
program.version('1.1.0');
log.setLevel('info');

programCommand('mint')
  .option('-u, --url <string>', 'metadata url')
  .option(
    '-c, --collection <string>',
    'Optional: Set this NFT as a part of a collection, Note you must be the update authority for this to work.',
  )
  .option('-um, --use-method <string>', 'Optional: Single, Multiple, or Burn')
  .option('-tum, --total-uses <number>', 'Optional: Allowed Number of Uses')
  .option('-ms, --max-supply <number>', 'Optional: Max Supply')
  .option(
    '-nvc, --no-verify-creators',
    'Optional: Disable Verification of Creators',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      url,
      collection,
      useMethod,
      totalUses,
      maxSupply,
      verifyCreators,
    } = cmd.opts();
    const solConnection = new web3.Connection(getCluster(env));
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
    } catch (e) {
      log.error(e);
    }
    const walletKeyPair = loadWalletKey(keypair);
    let collectionKey;
    if (collection !== undefined) {
      collectionKey = new PublicKey(collection);
    }
    const supply = maxSupply || 0;

    await mintNFT(
      solConnection,
      walletKeyPair,
      url,
      true,
      collectionKey,
      supply,
      verifyCreators,
      structuredUseMethod,
    );
  });

programCommand('update-metadata')
  .option('-m, --mint <string>', 'base58 mint key')
  .option('-u, --url <string>', 'metadata url')
  .option(
    '-c, --collection <string>',
    'Optional: Set this NFT as a part of a collection, Note you must be updat authority for this to work.',
  )
  .option('-um, --use-method <string>', 'Optional: Single, Multiple, or Burn')
  .option('-tum, --total-uses <number>', 'Optional: Allowed Number of Uses')
  .option(
    '-nvc, --no-verify-creators',
    'Optional: Disable Verification of Creators',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      mint,
      url,
      collection,
      useMethod,
      totalUses,
      verifyCreators,
    } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const solConnection = new web3.Connection(getCluster(env));
    const walletKeyPair = loadWalletKey(keypair);
    let structuredUseMethod;
    try {
      structuredUseMethod = parseUses(useMethod, totalUses);
      if (structuredUseMethod) {
        const info = await solConnection.getAccountInfo(mintKey);
        const meta = MetadataData.deserialize(info.data);
        if (meta?.uses && meta.uses.total > meta.uses.remaining) {
          log.error(
            'FAILED: This call will fail if you have used the NFT, you cannot change USES after using.',
          );
          return;
        }
      }
    } catch (e) {
      log.error(e);
    }
    let collectionKey;
    if (collection) {
      collectionKey = new PublicKey(collection);
    }

    await updateMetadata(
      mintKey,
      solConnection,
      walletKeyPair,
      url,
      collectionKey,
      verifyCreators,
      structuredUseMethod,
    );
  });

programCommand('verify-collection')
  .option('-m, --mint <string>', 'base58 mint key')
  .option(
    '-c, --collection-mint <string>',
    'base58 mint key: A collection is an NFT that can be verified as the collection for this nft',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, collectionMint } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const collectionMintKey = new PublicKey(collectionMint);
    const solConnection = new web3.Connection(getCluster(env));
    const walletKeyPair = loadWalletKey(keypair);
    await verifyCollection(
      mintKey,
      solConnection,
      walletKeyPair,
      collectionMintKey,
    );
  });

program
  .command('show')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option('-l, --log-level <string>', 'log level', setLogLevel)
  .option('-m, --mint <string>', 'base58 mint key')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { env, mint } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const solConnection = new web3.Connection(getCluster(env));
    const metadataAccount = await getMetadata(mintKey);
    const info = await solConnection.getAccountInfo(metadataAccount);
    if (info) {
      const meta = MetadataData.deserialize(info.data);
      log.info(meta);
    } else {
      log.info(`No Metadata account associated with: ${mintKey}`);
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
