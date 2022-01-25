"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CLUSTER = exports.CLUSTERS = exports.EXTENSION_JSON = exports.EXTENSION_GIF = exports.EXTENSION_JPG = exports.EXTENSION_PNG = exports.DEFAULT_TIMEOUT = exports.CACHE_PATH = exports.CONFIG_LINE_SIZE = exports.CONFIG_LINE_SIZE_V2 = exports.CONFIG_ARRAY_START_V2 = exports.CONFIG_ARRAY_START = exports.GUMDROP_TEMPORAL_SIGNER = exports.GUMDROP_DISTRIBUTOR_ID = exports.WRAPPED_SOL_MINT = exports.TOKEN_ENTANGLEMENT_PROGRAM_ID = exports.AUCTION_HOUSE_PROGRAM_ID = exports.FAIR_LAUNCH_PROGRAM_ID = exports.TOKEN_PROGRAM_ID = exports.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = exports.TOKEN_METADATA_PROGRAM_ID = exports.CANDY_MACHINE_PROGRAM_V2_ID = exports.CANDY_MACHINE_PROGRAM_ID = exports.ARWEAVE_PAYMENT_WALLET = exports.MAX_CREATOR_LIMIT = exports.MAX_CREATOR_LEN = exports.MAX_SYMBOL_LENGTH = exports.MAX_URI_LENGTH = exports.MAX_NAME_LENGTH = exports.TREASURY = exports.FEE_PAYER = exports.B = exports.A = exports.ESCROW = exports.TOKEN_ENTANGLER = exports.AUCTION_HOUSE = exports.CANDY_MACHINE = void 0;
const web3_js_1 = require("@solana/web3.js");
exports.CANDY_MACHINE = 'candy_machine';
exports.AUCTION_HOUSE = 'auction_house';
exports.TOKEN_ENTANGLER = 'token_entangler';
exports.ESCROW = 'escrow';
exports.A = 'A';
exports.B = 'B';
exports.FEE_PAYER = 'fee_payer';
exports.TREASURY = 'treasury';
exports.MAX_NAME_LENGTH = 32;
exports.MAX_URI_LENGTH = 200;
exports.MAX_SYMBOL_LENGTH = 10;
exports.MAX_CREATOR_LEN = 32 + 1 + 1;
exports.MAX_CREATOR_LIMIT = 5;
exports.ARWEAVE_PAYMENT_WALLET = new web3_js_1.PublicKey('6FKvsq4ydWFci6nGq9ckbjYMtnmaqAoatz5c9XWjiDuS');
exports.CANDY_MACHINE_PROGRAM_ID = new web3_js_1.PublicKey('cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ');
exports.CANDY_MACHINE_PROGRAM_V2_ID = new web3_js_1.PublicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ');
exports.TOKEN_METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
exports.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new web3_js_1.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
exports.TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
exports.FAIR_LAUNCH_PROGRAM_ID = new web3_js_1.PublicKey('faircnAB9k59Y4TXmLabBULeuTLgV7TkGMGNkjnA15j');
exports.AUCTION_HOUSE_PROGRAM_ID = new web3_js_1.PublicKey('hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk');
exports.TOKEN_ENTANGLEMENT_PROGRAM_ID = new web3_js_1.PublicKey('qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd');
exports.WRAPPED_SOL_MINT = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
exports.GUMDROP_DISTRIBUTOR_ID = new web3_js_1.PublicKey('gdrpGjVffourzkdDRrQmySw4aTHr8a3xmQzzxSwFD1a');
exports.GUMDROP_TEMPORAL_SIGNER = new web3_js_1.PublicKey('MSv9H2sMceAzccBganUXwGq3GXgqYAstmZAbFDZYbAV');
exports.CONFIG_ARRAY_START = 32 + // authority
    4 +
    6 + // uuid + u32 len
    4 +
    10 + // u32 len + symbol
    2 + // seller fee basis points
    1 +
    4 +
    5 * 34 + // optional + u32 len + actual vec
    8 + //max supply
    1 + //is mutable
    1 + // retain authority
    4; // max number of lines;
exports.CONFIG_ARRAY_START_V2 = 8 + // key
    32 + // authority
    32 + //wallet
    33 + // token mint
    4 +
    6 + // uuid
    8 + // price
    8 + // items available
    9 + // go live
    10 + // end settings
    4 +
    exports.MAX_SYMBOL_LENGTH + // u32 len + symbol
    2 + // seller fee basis points
    4 +
    exports.MAX_CREATOR_LIMIT * exports.MAX_CREATOR_LEN + // optional + u32 len + actual vec
    8 + //max supply
    1 + // is mutable
    1 + // retain authority
    1 + // option for hidden setting
    4 +
    exports.MAX_NAME_LENGTH + // name length,
    4 +
    exports.MAX_URI_LENGTH + // uri length,
    32 + // hash
    4 + // max number of lines;
    8 + // items redeemed
    1 + // whitelist option
    1 + // whitelist mint mode
    1 + // allow presale
    9 + // discount price
    32 + // mint key for whitelist
    1 +
    32 +
    1; // gatekeeper
exports.CONFIG_LINE_SIZE_V2 = 4 + 32 + 4 + 200;
exports.CONFIG_LINE_SIZE = 4 + 32 + 4 + 200;
exports.CACHE_PATH = './.cache';
exports.DEFAULT_TIMEOUT = 15000;
exports.EXTENSION_PNG = '.png';
exports.EXTENSION_JPG = '.jpg';
exports.EXTENSION_GIF = '.gif';
exports.EXTENSION_JSON = '.json';
exports.CLUSTERS = [
    {
        name: 'mainnet-beta',
        url: 'https://api.metaplex.solana.com/',
    },
    {
        name: 'testnet',
        url: (0, web3_js_1.clusterApiUrl)('testnet'),
    },
    {
        name: 'devnet',
        url: (0, web3_js_1.clusterApiUrl)('devnet'),
    },
];
exports.DEFAULT_CLUSTER = exports.CLUSTERS[2];
