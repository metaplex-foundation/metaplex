"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUses = exports.getCluster = exports.getPriceWithMantissa = exports.getMetadata = exports.generateRandoms = exports.chunks = exports.getMultipleAccounts = exports.parseDate = exports.parsePrice = exports.fromUTF8Array = exports.sleep = exports.getUnixTs = exports.generateRandomSet = exports.assertValidBreakdown = exports.shuffle = exports.readJsonFile = exports.getCandyMachineV2Config = void 0;
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const weighted_1 = __importDefault(require("weighted"));
const path_1 = __importDefault(require("path"));
const anchor_1 = require("@project-serum/anchor");
const spl_token_1 = require("@solana/spl-token");
const accounts_1 = require("./accounts");
const constants_1 = require("./constants");
const mpl_token_metadata_1 = require("@metaplex-foundation/mpl-token-metadata");
const { readFile } = fs_1.default.promises;
async function getCandyMachineV2Config(walletKeyPair, anchorProgram, configPath) {
    if (configPath === undefined) {
        throw new Error('The configPath is undefined');
    }
    const configString = fs_1.default.readFileSync(configPath);
    //@ts-ignore
    const config = JSON.parse(configString);
    const { storage, ipfsInfuraProjectId, number, ipfsInfuraSecret, awsS3Bucket, noRetainAuthority, noMutable, batchSize, price, splToken, splTokenAccount, solTreasuryAccount, gatekeeper, endSettings, hiddenSettings, whitelistMintSettings, goLiveDate, uuid, arweaveJwk, } = config;
    let wallet;
    let parsedPrice = price;
    const splTokenAccountFigured = splTokenAccount
        ? splTokenAccount
        : splToken
            ? (await (0, accounts_1.getAtaForMint)(new anchor_1.web3.PublicKey(splToken), walletKeyPair.publicKey))[0]
            : null;
    if (splToken) {
        if (solTreasuryAccount) {
            throw new Error('If spl-token-account or spl-token is set then sol-treasury-account cannot be set');
        }
        if (!splToken) {
            throw new Error('If spl-token-account is set, spl-token must also be set');
        }
        const splTokenKey = new anchor_1.web3.PublicKey(splToken);
        const splTokenAccountKey = new anchor_1.web3.PublicKey(splTokenAccountFigured);
        if (!splTokenAccountFigured) {
            throw new Error('If spl-token is set, spl-token-account must also be set');
        }
        const token = new spl_token_1.Token(anchorProgram.provider.connection, splTokenKey, spl_token_1.TOKEN_PROGRAM_ID, walletKeyPair);
        const mintInfo = await token.getMintInfo();
        if (!mintInfo.isInitialized) {
            throw new Error(`The specified spl-token is not initialized`);
        }
        const tokenAccount = await token.getAccountInfo(splTokenAccountKey);
        if (!tokenAccount.isInitialized) {
            throw new Error(`The specified spl-token-account is not initialized`);
        }
        if (!tokenAccount.mint.equals(splTokenKey)) {
            throw new Error(`The spl-token-account's mint (${tokenAccount.mint.toString()}) does not match specified spl-token ${splTokenKey.toString()}`);
        }
        wallet = new anchor_1.web3.PublicKey(splTokenAccountKey);
        parsedPrice = price * 10 ** mintInfo.decimals;
        if ((whitelistMintSettings === null || whitelistMintSettings === void 0 ? void 0 : whitelistMintSettings.discountPrice) ||
            (whitelistMintSettings === null || whitelistMintSettings === void 0 ? void 0 : whitelistMintSettings.discountPrice) === 0) {
            whitelistMintSettings.discountPrice *= 10 ** mintInfo.decimals;
        }
    }
    else {
        parsedPrice = price * 10 ** 9;
        if ((whitelistMintSettings === null || whitelistMintSettings === void 0 ? void 0 : whitelistMintSettings.discountPrice) ||
            (whitelistMintSettings === null || whitelistMintSettings === void 0 ? void 0 : whitelistMintSettings.discountPrice) === 0) {
            whitelistMintSettings.discountPrice *= 10 ** 9;
        }
        wallet = solTreasuryAccount
            ? new anchor_1.web3.PublicKey(solTreasuryAccount)
            : walletKeyPair.publicKey;
    }
    if (whitelistMintSettings) {
        whitelistMintSettings.mint = new anchor_1.web3.PublicKey(whitelistMintSettings.mint);
        if ((whitelistMintSettings === null || whitelistMintSettings === void 0 ? void 0 : whitelistMintSettings.discountPrice) ||
            (whitelistMintSettings === null || whitelistMintSettings === void 0 ? void 0 : whitelistMintSettings.discountPrice) === 0) {
            whitelistMintSettings.discountPrice = new anchor_1.BN(whitelistMintSettings.discountPrice);
        }
    }
    if (endSettings) {
        if (endSettings.endSettingType.date) {
            endSettings.number = new anchor_1.BN(parseDate(endSettings.value));
        }
        else if (endSettings.endSettingType.amount) {
            endSettings.number = new anchor_1.BN(endSettings.value);
        }
        delete endSettings.value;
    }
    if (hiddenSettings) {
        const utf8Encode = new TextEncoder();
        hiddenSettings.hash = utf8Encode.encode(hiddenSettings.hash);
    }
    if (gatekeeper) {
        gatekeeper.gatekeeperNetwork = new anchor_1.web3.PublicKey(gatekeeper.gatekeeperNetwork);
    }
    return {
        storage,
        ipfsInfuraProjectId,
        number,
        ipfsInfuraSecret,
        awsS3Bucket,
        retainAuthority: !noRetainAuthority,
        mutable: !noMutable,
        batchSize,
        price: new anchor_1.BN(parsedPrice),
        treasuryWallet: wallet,
        splToken: splToken ? new anchor_1.web3.PublicKey(splToken) : null,
        gatekeeper,
        endSettings,
        hiddenSettings,
        whitelistMintSettings,
        goLiveDate: goLiveDate ? new anchor_1.BN(parseDate(goLiveDate)) : null,
        uuid,
        arweaveJwk,
    };
}
exports.getCandyMachineV2Config = getCandyMachineV2Config;
async function readJsonFile(fileName) {
    const file = await readFile(fileName, 'utf-8');
    return JSON.parse(file);
}
exports.readJsonFile = readJsonFile;
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }
    return array;
}
exports.shuffle = shuffle;
const assertValidBreakdown = breakdown => {
    const total = Object.values(breakdown).reduce((sum, el) => (sum += el), 0);
    if (total > 101 || total < 99) {
        console.log(breakdown);
        throw new Error('Breakdown not within 1% of 100! It is: ' + total);
    }
};
exports.assertValidBreakdown = assertValidBreakdown;
const generateRandomSet = (breakdown, dnp) => {
    let valid = true;
    let tmp = {};
    do {
        valid = true;
        const keys = shuffle(Object.keys(breakdown));
        keys.forEach(attr => {
            const breakdownToUse = breakdown[attr];
            const formatted = Object.keys(breakdownToUse).reduce((f, key) => {
                if (breakdownToUse[key]['baseValue']) {
                    f[key] = breakdownToUse[key]['baseValue'];
                }
                else {
                    f[key] = breakdownToUse[key];
                }
                return f;
            }, {});
            (0, exports.assertValidBreakdown)(formatted);
            const randomSelection = weighted_1.default.select(formatted);
            tmp[attr] = randomSelection;
        });
        keys.forEach(attr => {
            let breakdownToUse = breakdown[attr];
            keys.forEach(otherAttr => {
                if (tmp[otherAttr] &&
                    typeof breakdown[otherAttr][tmp[otherAttr]] != 'number' &&
                    breakdown[otherAttr][tmp[otherAttr]][attr]) {
                    breakdownToUse = breakdown[otherAttr][tmp[otherAttr]][attr];
                    console.log('Because this item got attr', tmp[otherAttr], 'we are using different probabilites for', attr);
                    (0, exports.assertValidBreakdown)(breakdownToUse);
                    const randomSelection = weighted_1.default.select(breakdownToUse);
                    tmp[attr] = randomSelection;
                }
            });
        });
        Object.keys(tmp).forEach(attr1 => {
            Object.keys(tmp).forEach(attr2 => {
                if (dnp[attr1] &&
                    dnp[attr1][tmp[attr1]] &&
                    dnp[attr1][tmp[attr1]][attr2] &&
                    dnp[attr1][tmp[attr1]][attr2].includes(tmp[attr2])) {
                    console.log('Not including', tmp[attr1], tmp[attr2], 'together');
                    valid = false;
                    tmp = {};
                }
            });
        });
    } while (!valid);
    return tmp;
};
exports.generateRandomSet = generateRandomSet;
const getUnixTs = () => {
    return new Date().getTime() / 1000;
};
exports.getUnixTs = getUnixTs;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
function fromUTF8Array(data) {
    // array of bytes
    let str = '', i;
    for (i = 0; i < data.length; i++) {
        const value = data[i];
        if (value < 0x80) {
            str += String.fromCharCode(value);
        }
        else if (value > 0xbf && value < 0xe0) {
            str += String.fromCharCode(((value & 0x1f) << 6) | (data[i + 1] & 0x3f));
            i += 1;
        }
        else if (value > 0xdf && value < 0xf0) {
            str += String.fromCharCode(((value & 0x0f) << 12) |
                ((data[i + 1] & 0x3f) << 6) |
                (data[i + 2] & 0x3f));
            i += 2;
        }
        else {
            // surrogate pair
            const charCode = (((value & 0x07) << 18) |
                ((data[i + 1] & 0x3f) << 12) |
                ((data[i + 2] & 0x3f) << 6) |
                (data[i + 3] & 0x3f)) -
                0x010000;
            str += String.fromCharCode((charCode >> 10) | 0xd800, (charCode & 0x03ff) | 0xdc00);
            i += 3;
        }
    }
    return str;
}
exports.fromUTF8Array = fromUTF8Array;
function parsePrice(price, mantissa = web3_js_1.LAMPORTS_PER_SOL) {
    return Math.ceil(parseFloat(price) * mantissa);
}
exports.parsePrice = parsePrice;
function parseDate(date) {
    if (date === 'now') {
        return Date.now() / 1000;
    }
    return Date.parse(date) / 1000;
}
exports.parseDate = parseDate;
const getMultipleAccounts = async (connection, keys, commitment) => {
    const result = await Promise.all(chunks(keys, 99).map(chunk => getMultipleAccountsCore(connection, chunk, commitment)));
    const array = result
        .map(a => 
    //@ts-ignore
    a.array.map(acc => {
        if (!acc) {
            return undefined;
        }
        const { data, ...rest } = acc;
        const obj = {
            ...rest,
            data: Buffer.from(data[0], 'base64'),
        };
        return obj;
    }))
        //@ts-ignore
        .flat();
    return { keys, array };
};
exports.getMultipleAccounts = getMultipleAccounts;
function chunks(array, size) {
    return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) => array.slice(index * size, (index + 1) * size));
}
exports.chunks = chunks;
function generateRandoms(numberOfAttrs = 1, total = 100) {
    const numbers = [];
    const loose_percentage = total / numberOfAttrs;
    for (let i = 0; i < numberOfAttrs; i++) {
        const random = Math.floor(Math.random() * loose_percentage) + 1;
        numbers.push(random);
    }
    const sum = numbers.reduce((prev, cur) => {
        return prev + cur;
    }, 0);
    numbers.push(total - sum);
    return numbers;
}
exports.generateRandoms = generateRandoms;
const getMetadata = (name = '', symbol = '', index = 0, creators, description = '', seller_fee_basis_points = 500, attrs, collection, treatAttributesAsFileNames) => {
    const attributes = [];
    for (const prop in attrs) {
        attributes.push({
            trait_type: prop,
            value: treatAttributesAsFileNames
                ? path_1.default.parse(attrs[prop]).name
                : attrs[prop],
        });
    }
    return {
        name: `${name}${index + 1}`,
        symbol,
        image: `${index}.png`,
        properties: {
            files: [
                {
                    uri: `${index}.png`,
                    type: 'image/png',
                },
            ],
            category: 'image',
            creators,
        },
        description,
        seller_fee_basis_points,
        attributes,
        collection,
    };
};
exports.getMetadata = getMetadata;
const getMultipleAccountsCore = async (connection, keys, commitment) => {
    const args = connection._buildArgs([keys], commitment, 'base64');
    const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
    if (unsafeRes.error) {
        throw new Error('failed to get info about account ' + unsafeRes.error.message);
    }
    if (unsafeRes.result.value) {
        const array = unsafeRes.result.value;
        return { keys, array };
    }
    // TODO: fix
    throw new Error();
};
const getPriceWithMantissa = async (price, mint, walletKeyPair, anchorProgram) => {
    const token = new spl_token_1.Token(anchorProgram.provider.connection, new anchor_1.web3.PublicKey(mint), spl_token_1.TOKEN_PROGRAM_ID, walletKeyPair);
    const mintInfo = await token.getMintInfo();
    const mantissa = 10 ** mintInfo.decimals;
    return Math.ceil(price * mantissa);
};
exports.getPriceWithMantissa = getPriceWithMantissa;
function getCluster(name) {
    for (const cluster of constants_1.CLUSTERS) {
        if (cluster.name === name) {
            return cluster.url;
        }
    }
    return constants_1.DEFAULT_CLUSTER.url;
}
exports.getCluster = getCluster;
function parseUses(useMethod, total) {
    if (!!useMethod && !!total) {
        const realUseMethod = mpl_token_metadata_1.UseMethod[useMethod];
        if (!realUseMethod) {
            throw new Error(`Invalid use method: ${useMethod}`);
        }
        return new mpl_token_metadata_1.Uses({ useMethod: realUseMethod, total, remaining: total });
    }
    return null;
}
exports.parseUses = parseUses;
