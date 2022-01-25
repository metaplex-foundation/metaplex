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
exports.verifyCollection = exports.updateMetadata = exports.mintNFT = exports.createMetadata = void 0;
const instructions_1 = require("../helpers/instructions");
const transactions_1 = require("../helpers/transactions");
const accounts_1 = require("../helpers/accounts");
const anchor = __importStar(require("@project-serum/anchor"));
const schema_1 = require("../helpers/schema");
const borsh_1 = require("borsh");
const constants_1 = require("../helpers/constants");
const node_fetch_1 = __importDefault(require("node-fetch"));
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const loglevel_1 = __importDefault(require("loglevel"));
const mpl_token_metadata_1 = require("@metaplex-foundation/mpl-token-metadata");
const createMetadata = async (metadataLink, collection, uses) => {
    // Metadata
    let metadata;
    try {
        metadata = await (await (0, node_fetch_1.default)(metadataLink, { method: 'GET' })).json();
    }
    catch (e) {
        loglevel_1.default.debug(e);
        loglevel_1.default.error('Invalid metadata at', metadataLink);
        return;
    }
    // Validate metadata
    if (!metadata.name ||
        !metadata.image ||
        isNaN(metadata.seller_fee_basis_points) ||
        !metadata.properties ||
        !Array.isArray(metadata.properties.creators)) {
        loglevel_1.default.error('Invalid metadata file', metadata);
        return;
    }
    // Validate creators
    const metaCreators = metadata.properties.creators;
    if (metaCreators.some(creator => !creator.address) ||
        metaCreators.reduce((sum, creator) => creator.share + sum, 0) !== 100) {
        return;
    }
    const creators = metaCreators.map(creator => new schema_1.Creator({
        address: creator.address,
        share: creator.share,
        verified: 1,
    }));
    return new mpl_token_metadata_1.DataV2({
        symbol: metadata.symbol,
        name: metadata.name,
        uri: metadataLink,
        sellerFeeBasisPoints: metadata.seller_fee_basis_points,
        creators: creators,
        collection: collection
            ? new mpl_token_metadata_1.Collection({ key: collection.toBase58(), verified: false })
            : null,
        uses,
    });
};
exports.createMetadata = createMetadata;
const mintNFT = async (connection, walletKeypair, metadataLink, mutableMetadata = true, collection = null, use = null) => {
    // Retrieve metadata
    const data = await (0, exports.createMetadata)(metadataLink, collection, use);
    if (!data)
        return;
    // Create wallet from keypair
    const wallet = new anchor.Wallet(walletKeypair);
    if (!(wallet === null || wallet === void 0 ? void 0 : wallet.publicKey))
        return;
    // Allocate memory for the account
    const mintRent = await connection.getMinimumBalanceForRentExemption(spl_token_1.MintLayout.span);
    // Generate a mint
    const mint = anchor.web3.Keypair.generate();
    const instructions = [];
    const signers = [mint, walletKeypair];
    instructions.push(web3_js_1.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports: mintRent,
        space: spl_token_1.MintLayout.span,
        programId: constants_1.TOKEN_PROGRAM_ID,
    }));
    instructions.push(spl_token_1.Token.createInitMintInstruction(constants_1.TOKEN_PROGRAM_ID, mint.publicKey, 0, wallet.publicKey, wallet.publicKey));
    const userTokenAccoutAddress = await (0, accounts_1.getTokenWallet)(wallet.publicKey, mint.publicKey);
    instructions.push((0, instructions_1.createAssociatedTokenAccountInstruction)(userTokenAccoutAddress, wallet.publicKey, wallet.publicKey, mint.publicKey));
    // Create metadata
    const metadataAccount = await (0, accounts_1.getMetadata)(mint.publicKey);
    let txnData = Buffer.from((0, borsh_1.serialize)(new Map([
        mpl_token_metadata_1.DataV2.SCHEMA,
        ...schema_1.METADATA_SCHEMA,
        ...mpl_token_metadata_1.CreateMetadataV2Args.SCHEMA,
    ]), new mpl_token_metadata_1.CreateMetadataV2Args({ data, isMutable: mutableMetadata })));
    instructions.push((0, instructions_1.createMetadataInstruction)(metadataAccount, mint.publicKey, wallet.publicKey, wallet.publicKey, wallet.publicKey, txnData));
    instructions.push(spl_token_1.Token.createMintToInstruction(constants_1.TOKEN_PROGRAM_ID, mint.publicKey, userTokenAccoutAddress, wallet.publicKey, [], 1));
    // Create master edition
    const editionAccount = await (0, accounts_1.getMasterEdition)(mint.publicKey);
    txnData = Buffer.from((0, borsh_1.serialize)(new Map([
        mpl_token_metadata_1.DataV2.SCHEMA,
        ...schema_1.METADATA_SCHEMA,
        ...mpl_token_metadata_1.CreateMasterEditionV3Args.SCHEMA,
    ]), new mpl_token_metadata_1.CreateMasterEditionV3Args({ maxSupply: new anchor.BN(0) })));
    instructions.push((0, instructions_1.createMasterEditionInstruction)(metadataAccount, editionAccount, mint.publicKey, wallet.publicKey, wallet.publicKey, wallet.publicKey, txnData));
    const res = await (0, transactions_1.sendTransactionWithRetryWithKeypair)(connection, walletKeypair, instructions, signers);
    try {
        await connection.confirmTransaction(res.txid, 'max');
    }
    catch {
        // ignore
    }
    // Force wait for max confirmations
    await connection.getParsedConfirmedTransaction(res.txid, 'confirmed');
    loglevel_1.default.info('NFT created', res.txid);
    loglevel_1.default.info('\n\nNFT: Mint Address is ', mint.publicKey.toBase58());
    return metadataAccount;
};
exports.mintNFT = mintNFT;
const updateMetadata = async (mintKey, connection, walletKeypair, metadataLink, collection = null, uses) => {
    // Retrieve metadata
    const data = await (0, exports.createMetadata)(metadataLink, collection, uses);
    if (!data)
        return;
    const metadataAccount = await (0, accounts_1.getMetadata)(mintKey);
    const signers = [];
    const value = new mpl_token_metadata_1.UpdateMetadataV2Args({
        data,
        updateAuthority: walletKeypair.publicKey.toBase58(),
        primarySaleHappened: null,
        isMutable: true,
    });
    const txnData = Buffer.from((0, borsh_1.serialize)(schema_1.METADATA_SCHEMA, value));
    const instructions = [
        (0, instructions_1.createUpdateMetadataInstruction)(metadataAccount, walletKeypair.publicKey, txnData),
    ];
    // Execute transaction
    const txid = await (0, transactions_1.sendTransactionWithRetryWithKeypair)(connection, walletKeypair, instructions, signers);
    console.log('Metadata updated', txid);
    loglevel_1.default.info('\n\nUpdated NFT: Mint Address is ', mintKey.toBase58());
    return metadataAccount;
};
exports.updateMetadata = updateMetadata;
const verifyCollection = async (mintKey, connection, walletKeypair, collectionMint) => {
    const metadataAccount = await (0, accounts_1.getMetadata)(mintKey);
    const collectionMetadataAccount = await (0, accounts_1.getMetadata)(collectionMint);
    const collectionMasterEdition = await (0, accounts_1.getMasterEdition)(collectionMint);
    const signers = [walletKeypair];
    const tx = new mpl_token_metadata_1.VerifyCollection({ feePayer: walletKeypair.publicKey }, {
        metadata: metadataAccount,
        collectionAuthority: walletKeypair.publicKey,
        collectionMint: collectionMint,
        collectionMetadata: collectionMetadataAccount,
        collectionMasterEdition: collectionMasterEdition,
    });
    const txid = await (0, transactions_1.sendTransactionWithRetryWithKeypair)(connection, walletKeypair, tx.instructions, signers);
    return txid;
};
exports.verifyCollection = verifyCollection;
