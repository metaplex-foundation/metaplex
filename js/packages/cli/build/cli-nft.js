"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const loglevel_1 = __importDefault(require("loglevel"));
const mint_nft_1 = require("./commands/mint-nft");
const accounts_1 = require("./helpers/accounts");
const various_1 = require("./helpers/various");
const anchor_1 = require("@project-serum/anchor");
const web3_js_1 = require("@solana/web3.js");
const various_2 = require("./helpers/various");
const mpl_token_metadata_1 = require("@metaplex-foundation/mpl-token-metadata");
commander_1.program.version('1.1.0');
loglevel_1.default.setLevel('info');
programCommand('mint')
    .option('-u, --url <string>', 'metadata url')
    .option('-c, --collection <string>', 'Optional: Set this NFT as a part of a collection, Note you must be updat authority for this to work.')
    .option('-um, --use-method <string>', 'Optional: Single, Multiple, or Burn')
    .option('-tum, --total-uses <number>', 'Optional: Allowed Number of Uses')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, url, collection, useMethod, totalUses } = cmd.opts();
    const solConnection = new anchor_1.web3.Connection((0, various_2.getCluster)(env));
    let structuredUseMethod;
    try {
        structuredUseMethod = (0, various_1.parseUses)(useMethod, totalUses);
    }
    catch (e) {
        loglevel_1.default.error(e);
    }
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    let collectionKey;
    if (collection !== undefined) {
        collectionKey = new web3_js_1.PublicKey(collection);
    }
    await (0, mint_nft_1.mintNFT)(solConnection, walletKeyPair, url, true, collectionKey, structuredUseMethod);
});
programCommand('update-metadata')
    .option('-m, --mint <string>', 'base58 mint key')
    .option('-u, --url <string>', 'metadata url')
    .option('-c, --collection <string>', 'Optional: Set this NFT as a part of a collection, Note you must be updat authority for this to work.')
    .option('-um, --use-method <string>', 'Optional: Single, Multiple, or Burn')
    .option('-tum, --total-uses <number>', 'Optional: Allowed Number of Uses')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, mint, url, collection, useMethod, totalUses } = cmd.opts();
    const mintKey = new web3_js_1.PublicKey(mint);
    const solConnection = new anchor_1.web3.Connection((0, various_2.getCluster)(env));
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    let structuredUseMethod;
    try {
        structuredUseMethod = (0, various_1.parseUses)(useMethod, totalUses);
        if (structuredUseMethod) {
            const info = await solConnection.getAccountInfo(mintKey);
            const meta = mpl_token_metadata_1.MetadataData.deserialize(info.data);
            if ((meta === null || meta === void 0 ? void 0 : meta.uses) && meta.uses.total > meta.uses.remaining) {
                loglevel_1.default.error('FAILED: This call will fail if you have used the NFT, you cannot change USES after using.');
                return;
            }
        }
    }
    catch (e) {
        loglevel_1.default.error(e);
    }
    let collectionKey;
    if (collection) {
        collectionKey = new web3_js_1.PublicKey(collection);
    }
    await (0, mint_nft_1.updateMetadata)(mintKey, solConnection, walletKeyPair, url, collectionKey, structuredUseMethod);
});
programCommand('verify-collection')
    .option('-m, --mint <string>', 'base58 mint key')
    .option('-c, --collection-mint <string>', 'base58 mint key: A collection is an NFT that can be verified as the collection for this nft')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, mint, collectionMint } = cmd.opts();
    const mintKey = new web3_js_1.PublicKey(mint);
    const collectionMintKey = new web3_js_1.PublicKey(collectionMint);
    const solConnection = new anchor_1.web3.Connection((0, various_2.getCluster)(env));
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    await (0, mint_nft_1.verifyCollection)(mintKey, solConnection, walletKeyPair, collectionMintKey);
});
commander_1.program
    .command('show')
    .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
    .option('-l, --log-level <string>', 'log level', setLogLevel)
    .option('-m, --mint <string>', 'base58 mint key')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { env, mint } = cmd.opts();
    const mintKey = new web3_js_1.PublicKey(mint);
    const solConnection = new anchor_1.web3.Connection((0, various_2.getCluster)(env));
    const metadataAccount = await (0, accounts_1.getMetadata)(mintKey);
    const info = await solConnection.getAccountInfo(metadataAccount);
    if (info) {
        const meta = mpl_token_metadata_1.MetadataData.deserialize(info.data);
        loglevel_1.default.info(meta);
    }
    else {
        loglevel_1.default.info(`No Metadata account associated with: ${mintKey}`);
    }
});
function programCommand(name) {
    return commander_1.program
        .command(name)
        .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
        .option('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
        .option('-l, --log-level <string>', 'log level', setLogLevel);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
    if (value === undefined || value === null) {
        return;
    }
    loglevel_1.default.info('setting the log value to: ' + value);
    loglevel_1.default.setLevel(value);
}
commander_1.program.parse(process.argv);
