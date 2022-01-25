#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const commander_1 = require("commander");
const anchor = __importStar(require("@project-serum/anchor"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const various_1 = require("./helpers/various");
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./helpers/constants");
const accounts_1 = require("./helpers/accounts");
const upload_1 = require("./commands/upload");
const updateFromCache_1 = require("./commands/updateFromCache");
const verifyTokenMetadata_1 = require("./commands/verifyTokenMetadata");
const cache_1 = require("./helpers/cache");
const mint_1 = require("./commands/mint");
const sign_1 = require("./commands/sign");
const signAll_1 = require("./commands/signAll");
const loglevel_1 = __importDefault(require("loglevel"));
const withdraw_1 = require("./commands/withdraw");
const storage_type_1 = require("./helpers/storage-type");
const mime_1 = require("mime");
const supportedImageTypes = {
    'image/png': 1,
    'image/gif': 1,
    'image/jpeg': 1,
};
commander_1.program.version('0.0.2');
if (!fs.existsSync(constants_1.CACHE_PATH)) {
    fs.mkdirSync(constants_1.CACHE_PATH);
}
loglevel_1.default.setLevel(loglevel_1.default.levels.INFO);
programCommand('update_config_account')
    .argument('<directory>', 'Directory containing images named from 0-n', val => {
    return fs.readdirSync(`${val}`).map(file => path.join(val, file));
})
    .option('-b, --batchSize <number>', 'Batch size - defaults to 50. Has no Affect on Bundlr', '50')
    .option('-s, --storage <string>', `Database to use for storage (${Object.values(storage_type_1.StorageType).join(', ')})`, 'arweave')
    .option('--ipfs-infura-project-id <string>', 'Infura IPFS project id (required if using IPFS)')
    .option('--ipfs-infura-secret <string>', 'Infura IPFS scret key (required if using IPFS)')
    .option('--aws-s3-bucket <string>', '(existing) AWS S3 Bucket name (required if using aws)')
    .option('--arweave-jwk <string>', 'Path to Arweave wallet file (required if using Arweave Bundles (--storage arweave-bundle)')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (files, options, cmd) => {
    const { number, keypair, env, cacheName, storage, ipfsInfuraProjectId, ipfsInfuraSecret, awsS3Bucket, rpcUrl, arweaveJwk, batchSize, } = cmd.opts();
    deprecationWarning();
    if (storage === storage_type_1.StorageType.ArweaveSol && env !== 'mainnet-beta') {
        throw new Error('The arweave-sol storage option only works on mainnet. For devnet, please use either arweave, aws or ipfs\n');
    }
    if (storage === storage_type_1.StorageType.ArweaveBundle && env !== 'mainnet-beta') {
        throw new Error('The arweave-bundle storage option only works on mainnet because it requires spending real AR tokens. For devnet, please set the --storage option to "aws" or "ipfs"\n');
    }
    if (storage === storage_type_1.StorageType.Arweave) {
        loglevel_1.default.warn('WARNING: The "arweave" storage option will be going away soon. Please migrate to arweave-bundle or arweave-sol for mainnet.\n');
    }
    if (storage === storage_type_1.StorageType.ArweaveBundle && !arweaveJwk) {
        throw new Error('Path to Arweave JWK wallet file (--arweave-jwk) must be provided when using arweave-bundle');
    }
    if (storage === storage_type_1.StorageType.Ipfs &&
        (!ipfsInfuraProjectId || !ipfsInfuraSecret)) {
        throw new Error('IPFS selected as storage option but Infura project id or secret key were not provided.');
    }
    if (storage === storage_type_1.StorageType.Aws && !awsS3Bucket) {
        throw new Error('aws selected as storage option but existing bucket name (--aws-s3-bucket) not provided.');
    }
    if (!Object.values(storage_type_1.StorageType).includes(storage)) {
        throw new Error(`Storage option must either be ${Object.values(storage_type_1.StorageType).join(', ')}. Got: ${storage}`);
    }
    const ipfsCredentials = {
        projectId: ipfsInfuraProjectId,
        secretKey: ipfsInfuraSecret,
    };
    const imageFiles = files.filter(it => {
        return !it.endsWith(constants_1.EXTENSION_JSON);
    });
    const imageFileCount = imageFiles.length;
    imageFiles.forEach(it => {
        if (!supportedImageTypes[(0, mime_1.getType)(it)]) {
            throw new Error(`The file ${it} is not a supported file type.`);
        }
    });
    const jsonFileCount = files.filter(it => {
        return it.endsWith(constants_1.EXTENSION_JSON);
    }).length;
    const parsedNumber = parseInt(number);
    const elemCount = parsedNumber ? parsedNumber : imageFileCount;
    if (imageFileCount !== jsonFileCount) {
        throw new Error(`number of image files (${imageFileCount}) is different than the number of json files (${jsonFileCount})`);
    }
    if (elemCount < imageFileCount) {
        throw new Error(`max number (${elemCount})cannot be smaller than the number of elements in the source folder (${imageFileCount})`);
    }
    loglevel_1.default.info(`Beginning the upload for ${elemCount} (image+json) pairs`);
    const startMs = Date.now();
    loglevel_1.default.info('started at: ' + startMs.toString());
    try {
        await (0, upload_1.upload)({
            files,
            cacheName,
            env,
            keypair,
            storage,
            rpcUrl,
            ipfsCredentials,
            awsS3Bucket,
            arweaveJwk,
            batchSize,
        });
    }
    catch (err) {
        loglevel_1.default.warn('upload was not successful, please re-run.', err);
    }
    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    loglevel_1.default.info(`ended at: ${new Date(endMs).toISOString()}. time taken: ${timeTaken}`);
});
programCommand('withdraw')
    .option('-d ,--dry', 'Show Candy Machine withdraw amount without withdrawing.')
    .option('-ch, --charity <string>', 'Which charity?', '')
    .option('-cp, --charityPercent <string>', 'Which percent to charity?', '0')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, dry, charity, charityPercent, rpcUrl } = cmd.opts();
    if (charityPercent < 0 || charityPercent > 100) {
        loglevel_1.default.error('Charity percentage needs to be between 0 and 100');
        return;
    }
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
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
    const configs = await (0, accounts_1.getProgramAccounts)(anchorProgram.provider.connection, constants_1.CANDY_MACHINE_PROGRAM_ID.toBase58(), configOrCommitment);
    let t = 0;
    for (const cg in configs) {
        t += configs[cg].account.lamports;
    }
    const totalValue = t / web3_js_1.LAMPORTS_PER_SOL;
    const cpf = parseFloat(charityPercent);
    let charityPub;
    loglevel_1.default.info(`Total Number of Candy Machine Config Accounts to drain ${configs.length}`);
    loglevel_1.default.info(`${totalValue} SOL locked up in configs`);
    if (!!charity && charityPercent > 0) {
        const donation = totalValue * (100 / charityPercent);
        charityPub = new web3_js_1.PublicKey(charity);
        loglevel_1.default.info(`Of that ${totalValue} SOL, ${donation} will be donated to ${charity}. Thank you!`);
    }
    if (!dry) {
        const errors = [];
        loglevel_1.default.info('WARNING: This command will drain ALL of the Candy Machine config accounts that are owned by your current KeyPair, this will break your Candy Machine if its still in use');
        for (const cg of configs) {
            try {
                if (cg.account.lamports > 0) {
                    const tx = await (0, withdraw_1.withdraw)(anchorProgram, walletKeyPair, env, new web3_js_1.PublicKey(cg.pubkey), cg.account.lamports, charityPub, cpf);
                    loglevel_1.default.info(`${cg.pubkey} has been withdrawn. \nTransaction Signature: ${tx}`);
                }
            }
            catch (e) {
                loglevel_1.default.error(`Withdraw has failed for config account ${cg.pubkey} Error: ${e.message}`);
                errors.push(e);
            }
        }
        const successCount = configs.length - errors.length;
        const richness = successCount === configs.length ? 'rich again' : 'kinda rich';
        loglevel_1.default.info(`Congratulations, ${successCount} config accounts have been successfully drained.`);
        loglevel_1.default.info(`Now you ${richness}, please consider supporting Open Source developers.`);
    }
});
programCommand('verify_assets')
    .argument('<directory>', 'Directory containing images and metadata files named from 0-n', val => {
    return fs
        .readdirSync(`${val}`)
        .map(file => path.join(process.cwd(), val, file));
})
    .option('-n, --number <number>', 'Number of images to upload')
    .action((files, options, cmd) => {
    deprecationWarning();
    const { number } = cmd.opts();
    const startMs = Date.now();
    loglevel_1.default.info(`\n==> Starting verification: ${new Date(startMs).toString().split(' G')[0]}`);
    (0, verifyTokenMetadata_1.verifyTokenMetadata)({ files, uploadElementsCount: number });
    const endMs = Date.now();
    const timeTaken = new Date(endMs - startMs).toISOString().substr(11, 8);
    loglevel_1.default.info(`==> Verification ended: ${new Date(endMs).toString().split(' G')[0]}`);
    loglevel_1.default.info(`Elapsed time: ${timeTaken}\n`);
});
programCommand('verify_upload')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { env, keypair, rpcUrl, cacheName } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
    const configAddress = new web3_js_1.PublicKey(cacheContent.program.config);
    const config = await anchorProgram.provider.connection.getAccountInfo(configAddress);
    let allGood = true;
    const keys = Object.keys(cacheContent.items);
    await Promise.all((0, various_1.chunks)(Array.from(Array(keys.length).keys()), 500).map(async (allIndexesInSlice) => {
        for (let i = 0; i < allIndexesInSlice.length; i++) {
            const key = keys[allIndexesInSlice[i]];
            loglevel_1.default.debug('Looking at key ', allIndexesInSlice[i]);
            const thisSlice = config.data.slice(constants_1.CONFIG_ARRAY_START + 4 + constants_1.CONFIG_LINE_SIZE * allIndexesInSlice[i], constants_1.CONFIG_ARRAY_START +
                4 +
                constants_1.CONFIG_LINE_SIZE * (allIndexesInSlice[i] + 1));
            const name = (0, various_1.fromUTF8Array)([...thisSlice.slice(4, 36)]);
            const uri = (0, various_1.fromUTF8Array)([...thisSlice.slice(40, 240)]);
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
            }
            else {
                let json;
                try {
                    json = await (0, node_fetch_1.default)(cacheItem.link);
                }
                catch (e) {
                    json = { status: 404 };
                }
                if (json.status == 200 ||
                    json.status == 204 ||
                    json.status == 202) {
                    const body = await json.text();
                    const parsed = JSON.parse(body);
                    if (parsed.image) {
                        let check;
                        try {
                            check = await (0, node_fetch_1.default)(parsed.image);
                        }
                        catch (e) {
                            check = { status: 404 };
                        }
                        if (check.status == 200 ||
                            check.status == 204 ||
                            check.status == 202) {
                            const text = await check.text();
                            if (!text.match(/Not found/i)) {
                                if (text.length == 0) {
                                    loglevel_1.default.info('Name', name, 'with', uri, 'has zero length, failing');
                                    cacheItem.link = null;
                                    cacheItem.onChain = false;
                                    allGood = false;
                                }
                                else {
                                    loglevel_1.default.info('Name', name, 'with', uri, 'checked out');
                                }
                            }
                            else {
                                loglevel_1.default.info('Name', name, 'with', uri, 'never got uploaded to arweave, failing');
                                cacheItem.link = null;
                                cacheItem.onChain = false;
                                allGood = false;
                            }
                        }
                        else {
                            loglevel_1.default.info('Name', name, 'with', uri, 'returned non-200 from uploader', check.status);
                            cacheItem.link = null;
                            cacheItem.onChain = false;
                            allGood = false;
                        }
                    }
                    else {
                        loglevel_1.default.info('Name', name, 'with', uri, 'lacked image in json, failing');
                        cacheItem.link = null;
                        cacheItem.onChain = false;
                        allGood = false;
                    }
                }
                else {
                    loglevel_1.default.info('Name', name, 'with', uri, 'returned no json from link');
                    cacheItem.link = null;
                    cacheItem.onChain = false;
                    allGood = false;
                }
            }
        }
    }));
    if (!allGood) {
        (0, cache_1.saveCache)(cacheName, env, cacheContent);
        throw new Error(`not all NFTs checked out. check out logs above for details`);
    }
    const configData = (await anchorProgram.account.config.fetch(configAddress));
    const lineCount = new anchor.BN(config.data.slice(247, 247 + 4), undefined, 'le');
    loglevel_1.default.info(`uploaded (${lineCount.toNumber()}) out of (${configData.data.maxNumberOfLines})`);
    if (configData.data.maxNumberOfLines > lineCount.toNumber()) {
        throw new Error(`predefined number of NFTs (${configData.data.maxNumberOfLines}) is smaller than the uploaded one (${lineCount.toNumber()})`);
    }
    else {
        loglevel_1.default.info('ready to deploy!');
    }
    (0, cache_1.saveCache)(cacheName, env, cacheContent);
});
programCommand('verify_price')
    .requiredOption('-p, --price <string>')
    .option('--cache-path <string>')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, price, cacheName, rpcUrl, cachePath } = cmd.opts();
    const lamports = (0, various_1.parsePrice)(price);
    if (isNaN(lamports)) {
        return loglevel_1.default.error(`verify_price requires a valid --price to be set`);
    }
    loglevel_1.default.info(`Expected price is: ${lamports}`);
    const cacheContent = (0, cache_1.loadCache)(cacheName, env, cachePath);
    if (!cacheContent) {
        return loglevel_1.default.error(`No cache found, can't continue. Make sure you are in the correct directory where the assets are located or use the --cache-path option.`);
    }
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
    if (!cacheContent.candyMachineAddress) {
        useCandyMachineV2Error();
    }
    const candyAddress = new web3_js_1.PublicKey(cacheContent.candyMachineAddress);
    const machine = await anchorProgram.account.candyMachine.fetch(candyAddress);
    //@ts-ignore
    const candyMachineLamports = machine.data.price.toNumber();
    loglevel_1.default.info(`Candymachine price is: ${candyMachineLamports}`);
    if (lamports != candyMachineLamports) {
        throw new Error(`Expected price and CandyMachine's price do not match!`);
    }
    loglevel_1.default.info(`Good to go!`);
});
programCommand('show')
    .option('--cache-path <string>')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, cacheName, rpcUrl, cachePath } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env, cachePath);
    if (!cacheContent) {
        return loglevel_1.default.error(`No cache found, can't continue. Make sure you are in the correct directory where the assets are located or use the --cache-path option.`);
    }
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
    const [candyMachine] = await (0, accounts_1.getCandyMachineAddress)(new web3_js_1.PublicKey(cacheContent.program.config), cacheContent.program.uuid);
    try {
        const machine = await anchorProgram.account.candyMachine.fetch(candyMachine);
        loglevel_1.default.info('...Candy Machine...');
        loglevel_1.default.info('Key:', candyMachine.toBase58());
        //@ts-ignore
        loglevel_1.default.info('authority: ', machine.authority.toBase58());
        //@ts-ignore
        loglevel_1.default.info('wallet: ', machine.wallet.toBase58());
        //@ts-ignore
        loglevel_1.default.info('tokenMint: ', 
        //@ts-ignore
        machine.tokenMint ? machine.tokenMint.toBase58() : null);
        //@ts-ignore
        loglevel_1.default.info('config: ', machine.config.toBase58());
        //@ts-ignore
        loglevel_1.default.info('uuid: ', machine.data.uuid);
        //@ts-ignore
        loglevel_1.default.info('price: ', machine.data.price.toNumber());
        //@ts-ignore
        loglevel_1.default.info('itemsAvailable: ', machine.data.itemsAvailable.toNumber());
        //@ts-ignore
        loglevel_1.default.info('itemsRedeemed: ', machine.itemsRedeemed.toNumber());
        loglevel_1.default.info('goLiveDate: ', 
        //@ts-ignore
        machine.data.goLiveDate
            ? //@ts-ignore
                new Date(machine.data.goLiveDate * 1000)
            : 'N/A');
    }
    catch (e) {
        console.log('No machine found');
    }
    const config = await anchorProgram.account.config.fetch(cacheContent.program.config);
    loglevel_1.default.info('...Config...');
    //@ts-ignore
    loglevel_1.default.info('authority: ', config.authority.toBase58());
    //@ts-ignore
    loglevel_1.default.info('symbol: ', config.data.symbol);
    //@ts-ignore
    loglevel_1.default.info('sellerFeeBasisPoints: ', config.data.sellerFeeBasisPoints);
    //@ts-ignore
    loglevel_1.default.info('creators: ');
    //@ts-ignore
    config.data.creators.map(c => loglevel_1.default.info(c.address.toBase58(), 'at', c.share, '%')),
        //@ts-ignore
        loglevel_1.default.info('maxSupply: ', config.data.maxSupply.toNumber());
    //@ts-ignore
    loglevel_1.default.info('retainAuthority: ', config.data.retainAuthority);
    //@ts-ignore
    loglevel_1.default.info('isMutable: ', config.data.isMutable);
    //@ts-ignore
    loglevel_1.default.info('maxNumberOfLines: ', config.data.maxNumberOfLines);
});
programCommand('update_candy_machine')
    .option('-d, --date <string>', 'timestamp - eg "04 Dec 1995 00:12:00 GMT" or "now"')
    .option('-p, --price <string>', 'SOL price')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .option('--new-authority <Pubkey>', 'New Authority. Base58-encoded')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, date, rpcUrl, price, newAuthority, cacheName } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const secondsSinceEpoch = date ? (0, various_1.parseDate)(date) : null;
    const lamports = price ? (0, various_1.parsePrice)(price) : null;
    const newAuthorityKey = newAuthority ? new web3_js_1.PublicKey(newAuthority) : null;
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
    if (!cacheContent.candyMachineAddress) {
        useCandyMachineV2Error();
    }
    const candyMachine = new web3_js_1.PublicKey(cacheContent.candyMachineAddress);
    if (lamports || secondsSinceEpoch) {
        const tx = await anchorProgram.rpc.updateCandyMachine(lamports ? new anchor.BN(lamports) : null, secondsSinceEpoch ? new anchor.BN(secondsSinceEpoch) : null, {
            accounts: {
                candyMachine,
                authority: walletKeyPair.publicKey,
            },
        });
        cacheContent.startDate = secondsSinceEpoch;
        if (date)
            loglevel_1.default.info(` - updated startDate timestamp: ${secondsSinceEpoch} (${date})`);
        if (lamports)
            loglevel_1.default.info(` - updated price: ${lamports} lamports (${price} SOL)`);
        loglevel_1.default.info('update_candy_machine finished', tx);
    }
    if (newAuthorityKey) {
        const tx = await anchorProgram.rpc.updateAuthority(newAuthorityKey, {
            accounts: {
                candyMachine,
                authority: walletKeyPair.publicKey,
            },
        });
        cacheContent.authority = newAuthorityKey.toBase58();
        loglevel_1.default.info(` - updated authority: ${newAuthorityKey.toBase58()}`);
        loglevel_1.default.info('update_authority finished', tx);
    }
    (0, cache_1.saveCache)(cacheName, env, cacheContent);
});
programCommand('mint_one_token')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, cacheName, rpcUrl } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const configAddress = new web3_js_1.PublicKey(cacheContent.program.config);
    const tx = await (0, mint_1.mint)(keypair, env, configAddress, cacheContent.program.uuid, rpcUrl);
    loglevel_1.default.info('mint_one_token finished', tx);
});
programCommand('mint_multiple_tokens')
    .requiredOption('-n, --number <string>', 'Number of tokens')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (_, cmd) => {
    deprecationWarning();
    const { keypair, env, cacheName, number, rpcUrl } = cmd.opts();
    const NUMBER_OF_NFTS_TO_MINT = parseInt(number, 10);
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const configAddress = new web3_js_1.PublicKey(cacheContent.program.config);
    loglevel_1.default.info(`Minting ${NUMBER_OF_NFTS_TO_MINT} tokens...`);
    const mintToken = async (index) => {
        const tx = await (0, mint_1.mint)(keypair, env, configAddress, cacheContent.program.uuid, rpcUrl);
        loglevel_1.default.info(`transaction ${index + 1} complete`, tx);
        if (index < NUMBER_OF_NFTS_TO_MINT - 1) {
            loglevel_1.default.info('minting another token...');
            await mintToken(index + 1);
        }
    };
    await mintToken(0);
    loglevel_1.default.info(`minted ${NUMBER_OF_NFTS_TO_MINT} tokens`);
    loglevel_1.default.info('mint_multiple_tokens finished');
});
programCommand('sign')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .requiredOption('-m, --metadata <string>', 'base58 metadata account id')
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, rpcUrl, metadata } = cmd.opts();
    await (0, sign_1.signMetadata)(metadata, keypair, env, rpcUrl);
});
programCommand('sign_all')
    .option('-b, --batch-size <string>', 'Batch size', '10')
    .option('-d, --daemon', 'Run signing continuously', false)
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, cacheName, rpcUrl, batchSize, daemon } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
    if (!cacheContent.candyMachineAddress) {
        useCandyMachineV2Error();
    }
    const candyAddress = cacheContent.candyMachineAddress;
    const batchSizeParsed = parseInt(batchSize);
    if (!parseInt(batchSize)) {
        throw new Error('Batch size needs to be an integer!');
    }
    loglevel_1.default.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
    loglevel_1.default.debug('Environment: ', env);
    loglevel_1.default.debug('Candy machine address: ', candyAddress);
    loglevel_1.default.debug('Batch Size: ', batchSizeParsed);
    await (0, signAll_1.signAllMetadataFromCandyMachine)(anchorProgram.provider.connection, walletKeyPair, candyAddress, batchSizeParsed, daemon);
});
programCommand('update_existing_nfts_from_latest_cache_file')
    .option('-b, --batch-size <string>', 'Batch size', '2')
    .option('-nc, --new-cache <string>', 'Path to new updated cache file')
    .option('-d, --daemon', 'Run updating continuously', false)
    .option('-r, --rpc-url <string>', 'custom rpc url since this is a heavy command')
    .action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, cacheName, rpcUrl, batchSize, daemon, newCache } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const newCacheContent = (0, cache_1.loadCache)(newCache, env);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env, rpcUrl);
    if (!cacheContent.candyMachineAddress) {
        useCandyMachineV2Error();
    }
    const candyAddress = cacheContent.candyMachineAddress;
    const batchSizeParsed = parseInt(batchSize);
    if (!parseInt(batchSize)) {
        throw new Error('Batch size needs to be an integer!');
    }
    loglevel_1.default.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
    loglevel_1.default.debug('Environment: ', env);
    loglevel_1.default.debug('Candy machine address: ', candyAddress);
    loglevel_1.default.debug('Batch Size: ', batchSizeParsed);
    await (0, updateFromCache_1.updateFromCache)(anchorProgram.provider.connection, walletKeyPair, candyAddress, batchSizeParsed, daemon, cacheContent, newCacheContent);
});
// can then upload these
programCommand('randomize_unminted_nfts_in_new_cache_file').action(async (directory, cmd) => {
    deprecationWarning();
    const { keypair, env, cacheName } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env);
    if (!cacheContent.candyMachineAddress) {
        useCandyMachineV2Error();
    }
    const candyAddress = cacheContent.candyMachineAddress;
    loglevel_1.default.debug('Creator pubkey: ', walletKeyPair.publicKey.toBase58());
    loglevel_1.default.debug('Environment: ', env);
    loglevel_1.default.debug('Candy machine address: ', candyAddress);
    const candyMachine = await anchorProgram.account.candyMachine.fetch(candyAddress);
    const itemsRedeemed = candyMachine.itemsRedeemed;
    loglevel_1.default.info('Randomizing one later than', itemsRedeemed.toNumber());
    const keys = Object.keys(cacheContent.items).filter(k => parseInt(k) > itemsRedeemed);
    const shuffledKeys = (0, various_1.shuffle)(keys.slice());
    const newItems = {};
    for (let i = 0; i < keys.length; i++) {
        newItems[keys[i].toString()] =
            cacheContent.items[shuffledKeys[i].toString()];
        loglevel_1.default.debug('Setting ', keys[i], 'to ', shuffledKeys[i]);
        newItems[keys[i].toString()].onChain = false;
    }
    fs.writeFileSync('.cache/' + env + '-' + cacheName + '-randomized', JSON.stringify({
        ...cacheContent,
        items: { ...cacheContent.items, ...newItems },
    }));
});
programCommand('get_all_mint_addresses').action(async (directory, cmd) => {
    deprecationWarning();
    const { env, cacheName, keypair } = cmd.opts();
    const cacheContent = (0, cache_1.loadCache)(cacheName, env);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(walletKeyPair, env);
    if (!cacheContent.candyMachineAddress) {
        useCandyMachineV2Error();
    }
    const accountsByCreatorAddress = await (0, signAll_1.getAccountsByCreatorAddress)(cacheContent.candyMachineAddress, anchorProgram.provider.connection);
    const addresses = accountsByCreatorAddress.map(it => {
        return new web3_js_1.PublicKey(it[0].mint).toBase58();
    });
    console.log(JSON.stringify(addresses, null, 2));
});
function programCommand(name) {
    return commander_1.program
        .command(name)
        .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
        .requiredOption('-k, --keypair <path>', `Solana wallet location`)
        .option('-l, --log-level <string>', 'log level', setLogLevel)
        .option('-c, --cache-name <string>', 'Cache file name', 'temp');
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
    if (value == null) {
        return;
    }
    loglevel_1.default.info('setting the log value to: ' + value);
    loglevel_1.default.setLevel(value);
}
function errorColor(str) {
    // Add ANSI escape codes to display text in red.
    return `\x1b[31m${str}\x1b[0m`;
}
function deprecationWarning() {
    loglevel_1.default.warn(errorColor('Candy Machine V1 has been deprecated and new instances can no longer be created.\n' +
        'Although, you can still update existing V1 Candy Machines.\n\n' +
        'You must use Candy Machine V2 to create a new instance of a Candy Machine.\n' +
        'For more information about this change, visit https://docs.metaplex.com.\n'));
}
function useCandyMachineV2Error() {
    return loglevel_1.default.error('Candy Machine account not found in the cache. To create a new instance of a Candy Machine, please use Candy Machine V2.');
}
commander_1.program
    .configureOutput({
    // Visibly override write routines as example!
    writeOut: str => process.stdout.write(`[OUT] ${str}`),
    writeErr: str => process.stdout.write(`[ERR] ${str}`),
    // Highlight errors in color.
    outputError: (str, write) => write(errorColor(str)),
})
    .parse(process.argv);
