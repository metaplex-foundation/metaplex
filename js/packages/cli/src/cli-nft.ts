import { program } from 'commander';
import log from 'loglevel';
import {
  createMetadata,
  createMetadataAccount,
  mintNFT,
  setAndVerifyCollection,
  setAndVerifyCollectionAll,
  updateMetadata,
  validateMetadata,
  verifyCollection,
} from './commands/mint-nft';
import { getMetadata, loadWalletKey } from './helpers/accounts';
import { parseUses } from './helpers/various';
import { web3 } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { getCluster } from './helpers/various';
import { DataV2, MetadataData } from '@metaplex-foundation/mpl-token-metadata';
import * as fs from 'fs';

program.version('1.1.0');
log.setLevel('info');

programCommand('mint')
  .requiredOption('-u, --url <string>', 'metadata url')
  .option(
    '-w, --to-wallet <string>',
    'Optional: Wallet to receive nft. Defaults to keypair public key',
  )
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
      toWallet,
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
    let receivingWallet;
    if (toWallet) {
      receivingWallet = new PublicKey(toWallet);
    }
    await mintNFT(
      solConnection,
      walletKeyPair,
      url,
      true,
      collectionKey,
      supply,
      verifyCreators,
      structuredUseMethod,
      receivingWallet,
    );
  });

programCommand('create-metadata')
  .requiredOption('-m, --mint <string>', 'base58 mint key')
  .option('-u, --uri <string>', 'metadata uri')
  .option('-f, --file <string>', 'local file')
  .option(
    '-nvc, --no-verify-creators',
    'Optional: Disable Verification of Creators',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, uri, file, verifyCreators } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const connection = new web3.Connection(web3.clusterApiUrl(env));
    const walletKeypair = loadWalletKey(keypair);

    let data: DataV2;

    if (uri) {
      data = await createMetadata(uri, verifyCreators);
      if (!data) {
        log.error('No metadata found at URI.');
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
  .requiredOption('-m, --mint <string>', 'base58 mint key')
  .option('-u, --url <string>', 'metadata url')
  .option(
    '-c, --collection <string>',
    'Optional: Set this NFT as a part of a collection, Note you must be update authority on the NFT for this to work.',
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

programCommand('set-and-verify-collection')
  .requiredOption('-m, --mint <string>', 'base58 mint key')
  .requiredOption(
    '-c, --collection-mint <string>',
    'base58 mint key: A collection is an NFT that can be verified as the collection for this nft',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mint, collectionMint, rpcUrl } = cmd.opts();
    const mintKey = new PublicKey(mint);
    const collectionMintKey = new PublicKey(collectionMint);
    const solConnection = new web3.Connection(rpcUrl || getCluster(env));
    const walletKeyPair = loadWalletKey(keypair);
    await setAndVerifyCollection(
      mintKey,
      solConnection,
      walletKeyPair,
      collectionMintKey,
    );
  });

programCommand('set-and-verify-collection-all')
  .requiredOption('-h, --hashlist <path>', 'hashlist for the collection')
  .requiredOption(
    '-c, --collection-mint <string>',
    'base58 mint key: A collection is an NFT that can be verified as the collection for this nft',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .option(
    '-rl, --rate-limit <number>',
    'max number of concurrent requests for the write indices command',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, hashlist, collectionMint, rpcUrl, rateLimit } =
      cmd.opts();
    const collectionMintKey = new PublicKey(collectionMint);
    const solConnection = new web3.Connection(rpcUrl || getCluster(env));
    const walletKeyPair = loadWalletKey(keypair);

    const mintList: string[] = JSON.parse(fs.readFileSync(hashlist, 'utf-8'));
    await setAndVerifyCollectionAll(
      mintList,
      solConnection,
      walletKeyPair,
      collectionMintKey,
      rateLimit,
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
