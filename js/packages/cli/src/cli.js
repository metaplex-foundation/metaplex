#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.createAssociatedTokenAccountInstruction = void 0;
var fs = require("fs");
var path = require("path");
var node_fetch_1 = require("node-fetch");
var form_data_1 = require("form-data");
var commander_1 = require("commander");
var anchor = require("@project-serum/anchor");
var bn_js_1 = require("bn.js");
var spl_token_1 = require("@solana/spl-token");
var helper_1 = require("./helper");
var web3_js_1 = require("@solana/web3.js");
var CACHE_PATH = './.cache';
var PAYMENT_WALLET = new anchor.web3.PublicKey('HvwC9QSAzvGXhhVrgPmauVwFWcYZhne3hVot9EbHuFTm');
var ENV = 'devnet';
var CANDY_MACHINE = 'candy_machine';
var programId = new anchor.web3.PublicKey('cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ');
var TOKEN_METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
var SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new web3_js_1.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
var TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
var getTokenWallet = function (wallet, mint) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID)];
                case 1: return [2 /*return*/, (_a.sent())[0]];
            }
        });
    });
};
function createAssociatedTokenAccountInstruction(associatedTokenAddress, payer, walletAddress, splTokenMintAddress) {
    var keys = [
        {
            pubkey: payer,
            isSigner: true,
            isWritable: true
        },
        {
            pubkey: associatedTokenAddress,
            isSigner: false,
            isWritable: true
        },
        {
            pubkey: walletAddress,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: splTokenMintAddress,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false
        },
    ];
    return new web3_js_1.TransactionInstruction({
        keys: keys,
        programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        data: Buffer.from([])
    });
}
exports.createAssociatedTokenAccountInstruction = createAssociatedTokenAccountInstruction;
function chunks(array, size) {
    return Array.apply(0, new Array(Math.ceil(array.length / size))).map(function (_, index) { return array.slice(index * size, (index + 1) * size); });
}
var configArrayStart = 32 + // authority
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
var configLineSize = 4 + 32 + 4 + 200;
commander_1.program.version('0.0.1');
if (!fs.existsSync(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH);
}
var getCandyMachine = function (config, uuid) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, anchor.web3.PublicKey.findProgramAddress([Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)], programId)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
var getConfig = function (authority, uuid) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, anchor.web3.PublicKey.findProgramAddress([Buffer.from(CANDY_MACHINE), authority.toBuffer(), Buffer.from(uuid)], programId)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
var getMetadata = function (mint) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, anchor.web3.PublicKey.findProgramAddress([
                    Buffer.from('metadata'),
                    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                    mint.toBuffer(),
                ], TOKEN_METADATA_PROGRAM_ID)];
            case 1: return [2 /*return*/, (_a.sent())[0]];
        }
    });
}); };
var getMasterEdition = function (mint) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, anchor.web3.PublicKey.findProgramAddress([
                    Buffer.from('metadata'),
                    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                    mint.toBuffer(),
                    Buffer.from('edition'),
                ], TOKEN_METADATA_PROGRAM_ID)];
            case 1: return [2 /*return*/, (_a.sent())[0]];
        }
    });
}); };
var createConfig = function (anchorProgram, payerWallet, configData) {
    return __awaiter(this, void 0, void 0, function () {
        var size, config, uuid, _a, _b, _c, _d, _e;
        var _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    size = configArrayStart +
                        4 +
                        configData.maxNumberOfLines.toNumber() * configLineSize +
                        4 +
                        Math.ceil(configData.maxNumberOfLines.toNumber() / 8);
                    config = anchor.web3.Keypair.generate();
                    uuid = config.publicKey.toBase58().slice(0, 6);
                    _f = {
                        config: config.publicKey,
                        uuid: uuid
                    };
                    _b = (_a = anchorProgram.rpc).initializeConfig;
                    _c = [__assign({ uuid: uuid }, configData)];
                    _g = {
                        accounts: {
                            config: config.publicKey,
                            authority: payerWallet.publicKey,
                            payer: payerWallet.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                            rent: anchor.web3.SYSVAR_RENT_PUBKEY
                        },
                        signers: [payerWallet, config]
                    };
                    _e = (_d = anchor.web3.SystemProgram).createAccount;
                    _h = {
                        fromPubkey: payerWallet.publicKey,
                        newAccountPubkey: config.publicKey,
                        space: size
                    };
                    return [4 /*yield*/, anchorProgram.provider.connection.getMinimumBalanceForRentExemption(size)];
                case 1: return [4 /*yield*/, _b.apply(_a, _c.concat([(_g.instructions = [
                            _e.apply(_d, [(_h.lamports = _j.sent(),
                                    _h.programId = programId,
                                    _h)])
                        ],
                            _g)]))];
                case 2: return [2 /*return*/, (_f.txId = _j.sent(),
                        _f)];
            }
        });
    });
};
commander_1.program
    .command('upload')
    .argument('<directory>', 'Directory containing images named from 0-n', function (val) {
    return fs.readdirSync("" + val).map(function (file) { return path.join(val, file); });
})
    .option('-u, --url', 'Solana cluster url', 'https://api.mainnet-beta.solana.com/')
    .option('-k, --keypair <path>', 'Solana wallet')
    // .argument('[second]', 'integer argument', (val) => parseInt(val), 1000)
    .option('-s, --start-with', 'Image index to start with', '0')
    .option('-n, --number', 'Number of images to upload', '10000')
    .option('-c, --cache-name <path>', 'Cache file name')
    .action(function (files, options, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var extension, _a, startWith, keypair, cacheName, cachePath, savedContent, cacheContent, existingInCache, seen, newFiles, images, SIZE, walletKey, solConnection, walletWrapper, provider, idl, anchorProgram, config, block, i, image, imageName, index, storageCost, link, imageBuffer, manifestPath, manifestContent, manifest, manifestBuffer, sizeInBytes, res, exx_1, instructions, tx, data, result, metadataFile, er_1, e_1;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                extension = '.png';
                _a = cmd.opts(), startWith = _a.startWith, keypair = _a.keypair;
                cacheName = commander_1.program.getOptionValue('cacheName') || 'temp';
                cachePath = path.join(CACHE_PATH, cacheName);
                savedContent = fs.existsSync(cachePath)
                    ? JSON.parse(fs.readFileSync(cachePath).toString())
                    : undefined;
                cacheContent = savedContent || {};
                if (!cacheContent.program) {
                    cacheContent.program = {};
                }
                existingInCache = [];
                if (!cacheContent.items) {
                    cacheContent.items = {};
                }
                else {
                    existingInCache = Object.keys(cacheContent.items);
                }
                seen = {};
                newFiles = [];
                files.forEach(function (f) {
                    if (!seen[f.replace(extension, '').split('/').pop()]) {
                        seen[f.replace(extension, '').split('/').pop()] = true;
                        newFiles.push(f);
                    }
                });
                existingInCache.forEach(function (f) {
                    if (!seen[f]) {
                        seen[f] = true;
                        newFiles.push(f + '.png');
                    }
                });
                images = newFiles.filter(function (val) { return path.extname(val) === extension; });
                SIZE = images.length;
                walletKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())));
                solConnection = new anchor.web3.Connection("https://api." + ENV + ".solana.com/");
                walletWrapper = new anchor.Wallet(walletKey);
                provider = new anchor.Provider(solConnection, walletWrapper, {
                    preflightCommitment: 'recent'
                });
                return [4 /*yield*/, anchor.Program.fetchIdl(programId, provider)];
            case 1:
                idl = _e.sent();
                anchorProgram = new anchor.Program(idl, programId, provider);
                config = cacheContent.program.config
                    ? new anchor.web3.PublicKey(cacheContent.program.config)
                    : undefined;
                return [4 /*yield*/, solConnection.getRecentBlockhash()];
            case 2:
                block = _e.sent();
                i = 0;
                _e.label = 3;
            case 3:
                if (!(i < SIZE)) return [3 /*break*/, 14];
                image = images[i];
                imageName = path.basename(image);
                index = imageName.replace(extension, '');
                console.log("Processing file: " + index);
                storageCost = 10;
                link = (_c = (_b = cacheContent === null || cacheContent === void 0 ? void 0 : cacheContent.items) === null || _b === void 0 ? void 0 : _b[index]) === null || _c === void 0 ? void 0 : _c.link;
                if (!(!link || !cacheContent.program.uuid)) return [3 /*break*/, 13];
                imageBuffer = Buffer.from(fs.readFileSync(image));
                manifestPath = image.replace(extension, '.json');
                manifestContent = fs
                    .readFileSync(manifestPath)
                    .toString()
                    .replace(imageName, 'image.png')
                    .replace(imageName, 'image.png');
                manifest = JSON.parse(manifestContent);
                manifestBuffer = Buffer.from(JSON.stringify(manifest));
                sizeInBytes = imageBuffer.length + manifestBuffer.length;
                if (!(i === 0 && !cacheContent.program.uuid)) return [3 /*break*/, 7];
                _e.label = 4;
            case 4:
                _e.trys.push([4, 6, , 7]);
                return [4 /*yield*/, createConfig(anchorProgram, walletKey, {
                        maxNumberOfLines: new bn_js_1["default"](SIZE),
                        symbol: manifest.symbol,
                        sellerFeeBasisPoints: manifest.seller_fee_basis_points,
                        isMutable: true,
                        maxSupply: new bn_js_1["default"](0),
                        retainAuthority: true,
                        creators: manifest.properties.creators.map(function (creator) {
                            return {
                                address: new anchor.web3.PublicKey(creator.address),
                                verified: false,
                                share: creator.share
                            };
                        })
                    })];
            case 5:
                res = _e.sent();
                cacheContent.program.uuid = res.uuid;
                cacheContent.program.config = res.config.toBase58();
                config = res.config;
                fs.writeFileSync(path.join(CACHE_PATH, cacheName), JSON.stringify(cacheContent));
                return [3 /*break*/, 7];
            case 6:
                exx_1 = _e.sent();
                console.error('Error deploying config to Solana network.', exx_1);
                return [3 /*break*/, 7];
            case 7:
                if (!!link) return [3 /*break*/, 13];
                instructions = [
                    anchor.web3.SystemProgram.transfer({
                        fromPubkey: walletKey.publicKey,
                        toPubkey: PAYMENT_WALLET,
                        lamports: storageCost
                    }),
                ];
                return [4 /*yield*/, (0, helper_1.sendTransactionWithRetryWithKeypair)(solConnection, walletKey, instructions, [], 'single')];
            case 8:
                tx = _e.sent();
                data = new form_data_1["default"]();
                data.append('transaction', tx);
                data.append('env', ENV);
                data.append('file[]', fs.createReadStream(image), "image.png");
                data.append('file[]', manifestBuffer, 'metadata.json');
                _e.label = 9;
            case 9:
                _e.trys.push([9, 12, , 13]);
                return [4 /*yield*/, (0, node_fetch_1["default"])('https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile3', {
                        method: 'POST',
                        body: data
                    })];
            case 10: return [4 /*yield*/, (_e.sent()).json()];
            case 11:
                result = _e.sent();
                metadataFile = (_d = result.messages) === null || _d === void 0 ? void 0 : _d.find(function (m) { return m.filename === 'manifest.json'; });
                if (metadataFile === null || metadataFile === void 0 ? void 0 : metadataFile.transactionId) {
                    link = "https://arweave.net/" + metadataFile.transactionId;
                    console.log("File uploaded: " + link);
                }
                cacheContent.items[index] = {
                    link: link,
                    name: manifest.name,
                    onChain: false
                };
                fs.writeFileSync(path.join(CACHE_PATH, cacheName), JSON.stringify(cacheContent));
                return [3 /*break*/, 13];
            case 12:
                er_1 = _e.sent();
                console.error("Error uploading file " + index, er_1);
                return [3 /*break*/, 13];
            case 13:
                i++;
                return [3 /*break*/, 3];
            case 14:
                _e.trys.push([14, 16, 17, 18]);
                return [4 /*yield*/, Promise.all(chunks(Array.from(Array(images.length).keys()), 1000).map(function (allIndexesInSlice) { return __awaiter(void 0, void 0, void 0, function () {
                        var offset, indexes, onChain, ind, txId;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    offset = 0;
                                    _a.label = 1;
                                case 1:
                                    if (!(offset < allIndexesInSlice.length)) return [3 /*break*/, 4];
                                    indexes = allIndexesInSlice.slice(offset, offset + 10);
                                    onChain = indexes.filter(function (i) {
                                        var index = images[i].replace(extension, '').split('/').pop();
                                        return cacheContent.items[index].onChain;
                                    });
                                    ind = images[indexes[0]]
                                        .replace(extension, '')
                                        .split('/')
                                        .pop();
                                    if (!(onChain.length != indexes.length)) return [3 /*break*/, 3];
                                    console.log('Writing indices ', ind, '-', parseInt(ind) + indexes.length);
                                    return [4 /*yield*/, anchorProgram.rpc.addConfigLines(ind, indexes.map(function (i) { return ({
                                            uri: cacheContent.items[images[i].replace(extension, '').split('/').pop()].link,
                                            name: cacheContent.items[images[i].replace(extension, '').split('/').pop()].name
                                        }); }), {
                                            accounts: {
                                                config: config,
                                                authority: walletKey.publicKey
                                            },
                                            signers: [walletKey]
                                        })];
                                case 2:
                                    txId = _a.sent();
                                    indexes.forEach(function (i) {
                                        cacheContent.items[images[i].replace(extension, '').split('/').pop()] = __assign(__assign({}, cacheContent.items[images[i].replace(extension, '').split('/').pop()]), { onChain: true });
                                    });
                                    fs.writeFileSync(path.join(CACHE_PATH, cacheName), JSON.stringify(cacheContent));
                                    _a.label = 3;
                                case 3:
                                    offset += 10;
                                    return [3 /*break*/, 1];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 15:
                _e.sent();
                return [3 /*break*/, 18];
            case 16:
                e_1 = _e.sent();
                console.error(e_1);
                return [3 /*break*/, 18];
            case 17:
                fs.writeFileSync(path.join(CACHE_PATH, cacheName), JSON.stringify(cacheContent));
                return [7 /*endfinally*/];
            case 18:
                console.log('Done');
                return [2 /*return*/];
        }
    });
}); });
commander_1.program
    .command('set_start_date')
    .option('-k, --keypair <path>', 'Solana wallet')
    .option('-c, --cache-name <path>', 'Cache file name')
    .option('-d, --date <string>', 'timestamp - eg "04 Dec 1995 00:12:00 GMT"')
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var solConnection, keypair, cacheName, cachePath, cachedContent, date, secondsSinceEpoch, walletKey, walletWrapper, provider, idl, anchorProgram, _a, candyMachine, _, tx;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                solConnection = new anchor.web3.Connection("https://api." + ENV + ".solana.com/");
                keypair = cmd.opts().keypair;
                cacheName = cmd.getOptionValue('cacheName') || 'temp';
                cachePath = path.join(CACHE_PATH, cacheName);
                cachedContent = fs.existsSync(cachePath)
                    ? JSON.parse(fs.readFileSync(cachePath).toString())
                    : undefined;
                date = cmd.getOptionValue('date');
                secondsSinceEpoch = (date ? Date.parse(date) : Date.now()) / 1000;
                walletKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())));
                walletWrapper = new anchor.Wallet(walletKey);
                provider = new anchor.Provider(solConnection, walletWrapper, {
                    preflightCommitment: 'recent'
                });
                return [4 /*yield*/, anchor.Program.fetchIdl(programId, provider)];
            case 1:
                idl = _b.sent();
                anchorProgram = new anchor.Program(idl, programId, provider);
                return [4 /*yield*/, getCandyMachine(new anchor.web3.PublicKey(cachedContent.program.config), cachedContent.program.uuid)];
            case 2:
                _a = _b.sent(), candyMachine = _a[0], _ = _a[1];
                return [4 /*yield*/, anchorProgram.rpc.updateCandyMachine(null, new anchor.BN(secondsSinceEpoch), {
                        accounts: {
                            candyMachine: candyMachine,
                            authority: walletKey.publicKey
                        }
                    })];
            case 3:
                tx = _b.sent();
                console.log('Done', secondsSinceEpoch, tx);
                return [2 /*return*/];
        }
    });
}); });
commander_1.program
    .command('create_candy_machine')
    .option('-k, --keypair <path>', 'Solana wallet')
    .option('-c, --cache-name <path>', 'Cache file name')
    .option('-p, --price <string>', 'SOL price')
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var solConnection, keypair, solPriceStr, lamports, cacheName, cachePath, cachedContent, walletKey, walletWrapper, provider, idl, anchorProgram, config, _a, candyMachine, bump, tx;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                solConnection = new anchor.web3.Connection("https://api." + ENV + ".solana.com/");
                keypair = cmd.opts().keypair;
                solPriceStr = cmd.getOptionValue('price') || '1';
                lamports = parseInt(solPriceStr) * web3_js_1.LAMPORTS_PER_SOL;
                cacheName = commander_1.program.getOptionValue('cacheName') || 'temp';
                cachePath = path.join(CACHE_PATH, cacheName);
                cachedContent = fs.existsSync(cachePath)
                    ? JSON.parse(fs.readFileSync(cachePath).toString())
                    : undefined;
                walletKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())));
                walletWrapper = new anchor.Wallet(walletKey);
                provider = new anchor.Provider(solConnection, walletWrapper, {
                    preflightCommitment: 'recent'
                });
                return [4 /*yield*/, anchor.Program.fetchIdl(programId, provider)];
            case 1:
                idl = _b.sent();
                anchorProgram = new anchor.Program(idl, programId, provider);
                config = new anchor.web3.PublicKey(cachedContent.program.config);
                return [4 /*yield*/, getCandyMachine(config, cachedContent.program.uuid)];
            case 2:
                _a = _b.sent(), candyMachine = _a[0], bump = _a[1];
                return [4 /*yield*/, anchorProgram.rpc.initializeCandyMachine(bump, {
                        uuid: cachedContent.program.uuid,
                        price: new anchor.BN(lamports),
                        itemsAvailable: new anchor.BN(Object.keys(cachedContent.items).length),
                        goLiveDate: null
                    }, {
                        accounts: {
                            candyMachine: candyMachine,
                            wallet: walletKey.publicKey,
                            config: config,
                            authority: walletKey.publicKey,
                            payer: walletKey.publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                            rent: anchor.web3.SYSVAR_RENT_PUBKEY
                        },
                        signers: []
                    })];
            case 3:
                tx = _b.sent();
                console.log('Done');
                return [2 /*return*/];
        }
    });
}); });
commander_1.program
    .command('mint_token_as_candy_machine_owner')
    .option('-k, --keypair <path>', 'Solana wallet')
    .option('-c, --cache-name <path>', 'Cache file name')
    .action(function (directory, cmd) { return __awaiter(void 0, void 0, void 0, function () {
    var solConnection, keypair, solPriceStr, lamports, cacheName, cachePath, cachedContent, mint, walletKey, token, walletWrapper, provider, idl, anchorProgram, config, _a, candyMachine, bump, metadata, masterEdition, tx, _b, _c, _d, _e;
    var _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                solConnection = new anchor.web3.Connection("https://api." + ENV + ".solana.com/");
                keypair = cmd.opts().keypair;
                solPriceStr = commander_1.program.getOptionValue('price') || '1';
                lamports = parseInt(solPriceStr) * web3_js_1.LAMPORTS_PER_SOL;
                cacheName = commander_1.program.getOptionValue('cacheName') || 'temp';
                cachePath = path.join(CACHE_PATH, cacheName);
                cachedContent = fs.existsSync(cachePath)
                    ? JSON.parse(fs.readFileSync(cachePath).toString())
                    : undefined;
                mint = anchor.web3.Keypair.generate();
                walletKey = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())));
                return [4 /*yield*/, getTokenWallet(walletKey.publicKey, mint.publicKey)];
            case 1:
                token = _h.sent();
                walletWrapper = new anchor.Wallet(walletKey);
                provider = new anchor.Provider(solConnection, walletWrapper, {
                    preflightCommitment: 'recent'
                });
                return [4 /*yield*/, anchor.Program.fetchIdl(programId, provider)];
            case 2:
                idl = _h.sent();
                anchorProgram = new anchor.Program(idl, programId, provider);
                config = new anchor.web3.PublicKey(cachedContent.program.config);
                return [4 /*yield*/, getCandyMachine(config, cachedContent.program.uuid)];
            case 3:
                _a = _h.sent(), candyMachine = _a[0], bump = _a[1];
                return [4 /*yield*/, getMetadata(mint.publicKey)];
            case 4:
                metadata = _h.sent();
                return [4 /*yield*/, getMasterEdition(mint.publicKey)];
            case 5:
                masterEdition = _h.sent();
                _c = (_b = anchorProgram.rpc).mintNft;
                _f = {
                    accounts: {
                        config: config,
                        candyMachine: candyMachine,
                        payer: walletKey.publicKey,
                        wallet: walletKey.publicKey,
                        mint: mint.publicKey,
                        metadata: metadata,
                        masterEdition: masterEdition,
                        mintAuthority: walletKey.publicKey,
                        updateAuthority: walletKey.publicKey,
                        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: web3_js_1.SystemProgram.programId,
                        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
                    },
                    signers: [mint, walletKey]
                };
                _e = (_d = anchor.web3.SystemProgram).createAccount;
                _g = {
                    fromPubkey: walletKey.publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: spl_token_1.MintLayout.span
                };
                return [4 /*yield*/, provider.connection.getMinimumBalanceForRentExemption(spl_token_1.MintLayout.span)];
            case 6: return [4 /*yield*/, _c.apply(_b, [(_f.instructions = [
                        _e.apply(_d, [(_g.lamports = _h.sent(),
                                _g.programId = TOKEN_PROGRAM_ID,
                                _g)]),
                        spl_token_1.Token.createInitMintInstruction(TOKEN_PROGRAM_ID, mint.publicKey, 0, walletKey.publicKey, walletKey.publicKey),
                        createAssociatedTokenAccountInstruction(token, walletKey.publicKey, walletKey.publicKey, mint.publicKey),
                        spl_token_1.Token.createMintToInstruction(TOKEN_PROGRAM_ID, mint.publicKey, token, walletKey.publicKey, [], 1)
                    ],
                        _f)])];
            case 7:
                tx = _h.sent();
                console.log('Done', tx);
                return [2 /*return*/];
        }
    });
}); });
commander_1.program
    .command('verify')
    .option('-c, --cache-name <path>', 'Cache file name')
    .action(function (directory, second, options) { return __awaiter(void 0, void 0, void 0, function () {
    var solConnection, cacheName, cachePath, cachedContent, config, keys, i, key, thisSlice, name_1, uri, cacheItem;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                solConnection = new anchor.web3.Connection("https://api." + ENV + ".solana.com/");
                cacheName = commander_1.program.getOptionValue('cacheName') || 'temp';
                cachePath = path.join(CACHE_PATH, cacheName);
                cachedContent = fs.existsSync(cachePath)
                    ? JSON.parse(fs.readFileSync(cachePath).toString())
                    : undefined;
                return [4 /*yield*/, solConnection.getAccountInfo(new web3_js_1.PublicKey(cachedContent.program.config))];
            case 1:
                config = _a.sent();
                keys = Object.keys(cachedContent.items);
                for (i = 0; i < keys.length; i++) {
                    console.log('Looking at key ', i);
                    key = keys[i];
                    thisSlice = config.data.slice(configArrayStart + 4 + configLineSize * i, configArrayStart + 4 + configLineSize * (i + 1));
                    name_1 = (0, helper_1.fromUTF8Array)(__spreadArray([], thisSlice.slice(4, 36), true));
                    uri = (0, helper_1.fromUTF8Array)(__spreadArray([], thisSlice.slice(40, 240), true));
                    cacheItem = cachedContent.items[key];
                    if (!name_1.match(cacheItem.name) || !uri.match(cacheItem.link)) {
                        console.log('Name', name_1, 'or uri', uri, 'didnt match cache values of', cacheItem.name, 'and', cacheItem.link, ' marking to rerun for image', key);
                        cacheItem.onChain = false;
                    }
                    else {
                        console.log('Name', name_1, 'with', uri, 'checked out');
                    }
                }
                fs.writeFileSync(path.join(CACHE_PATH, cacheName), JSON.stringify(cachedContent));
                return [2 /*return*/];
        }
    });
}); });
commander_1.program.command('find-wallets').action(function () { });
commander_1.program.parse(process.argv);
