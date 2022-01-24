"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEditionMarkPda = exports.deprecatedGetReservationList = exports.getMetadata = exports.getEdition = exports.convertMasterEditionV1ToV2 = exports.deprecatedMintPrintingTokens = exports.signMetadata = exports.deprecatedCreateReservationList = exports.updatePrimarySaleHappenedViaToken = exports.mintNewEditionFromMasterEditionViaToken = exports.deprecatedMintNewEditionFromMasterEditionViaPrintingToken = exports.createMasterEdition = exports.createMetadata = exports.updateMetadata = exports.decodeMasterEdition = exports.decodeEdition = exports.decodeEditionMarker = exports.decodeMetadata = exports.METADATA_SCHEMA = exports.Metadata = exports.Data = exports.Creator = exports.Edition = exports.EditionMarker = exports.MasterEditionV2 = exports.MasterEditionV1 = exports.MetadataCategory = exports.MetadataKey = exports.EDITION_MARKER_BIT_SIZE = exports.MAX_EDITION_LEN = exports.MAX_METADATA_LEN = exports.MAX_CREATOR_LEN = exports.MAX_CREATOR_LIMIT = exports.MAX_URI_LENGTH = exports.MAX_SYMBOL_LENGTH = exports.MAX_NAME_LENGTH = exports.RESERVATION = exports.EDITION = exports.METADATA_PREFIX = void 0;
const web3_js_1 = require("@solana/web3.js");
const programIds_1 = require("../utils/programIds");
const borsh_1 = require("borsh");
const utils_1 = require("../utils");
exports.METADATA_PREFIX = 'metadata';
exports.EDITION = 'edition';
exports.RESERVATION = 'reservation';
exports.MAX_NAME_LENGTH = 32;
exports.MAX_SYMBOL_LENGTH = 10;
exports.MAX_URI_LENGTH = 200;
exports.MAX_CREATOR_LIMIT = 5;
exports.MAX_CREATOR_LEN = 32 + 1 + 1;
exports.MAX_METADATA_LEN = 1 +
    32 +
    32 +
    exports.MAX_NAME_LENGTH +
    exports.MAX_SYMBOL_LENGTH +
    exports.MAX_URI_LENGTH +
    exports.MAX_CREATOR_LIMIT * exports.MAX_CREATOR_LEN +
    2 +
    1 +
    1 +
    198;
exports.MAX_EDITION_LEN = 1 + 32 + 8 + 200;
exports.EDITION_MARKER_BIT_SIZE = 248;
var MetadataKey;
(function (MetadataKey) {
    MetadataKey[MetadataKey["Uninitialized"] = 0] = "Uninitialized";
    MetadataKey[MetadataKey["MetadataV1"] = 4] = "MetadataV1";
    MetadataKey[MetadataKey["EditionV1"] = 1] = "EditionV1";
    MetadataKey[MetadataKey["MasterEditionV1"] = 2] = "MasterEditionV1";
    MetadataKey[MetadataKey["MasterEditionV2"] = 6] = "MasterEditionV2";
    MetadataKey[MetadataKey["EditionMarker"] = 7] = "EditionMarker";
})(MetadataKey = exports.MetadataKey || (exports.MetadataKey = {}));
var MetadataCategory;
(function (MetadataCategory) {
    MetadataCategory["Audio"] = "audio";
    MetadataCategory["Video"] = "video";
    MetadataCategory["Image"] = "image";
    MetadataCategory["VR"] = "vr";
    MetadataCategory["HTML"] = "html";
})(MetadataCategory = exports.MetadataCategory || (exports.MetadataCategory = {}));
class MasterEditionV1 {
    constructor(args) {
        this.key = MetadataKey.MasterEditionV1;
        this.supply = args.supply;
        this.maxSupply = args.maxSupply;
        this.printingMint = args.printingMint;
        this.oneTimePrintingAuthorizationMint =
            args.oneTimePrintingAuthorizationMint;
    }
}
exports.MasterEditionV1 = MasterEditionV1;
class MasterEditionV2 {
    constructor(args) {
        this.key = MetadataKey.MasterEditionV2;
        this.supply = args.supply;
        this.maxSupply = args.maxSupply;
    }
}
exports.MasterEditionV2 = MasterEditionV2;
class EditionMarker {
    constructor(args) {
        this.key = MetadataKey.EditionMarker;
        this.ledger = args.ledger;
    }
    editionTaken(edition) {
        const editionOffset = edition % exports.EDITION_MARKER_BIT_SIZE;
        const indexOffset = Math.floor(editionOffset / 8);
        if (indexOffset > 30) {
            throw Error('bad index for edition');
        }
        const positionInBitsetFromRight = 7 - (editionOffset % 8);
        const mask = Math.pow(2, positionInBitsetFromRight);
        const appliedMask = this.ledger[indexOffset] & mask;
        return appliedMask != 0;
    }
}
exports.EditionMarker = EditionMarker;
class Edition {
    constructor(args) {
        this.key = MetadataKey.EditionV1;
        this.parent = args.parent;
        this.edition = args.edition;
    }
}
exports.Edition = Edition;
class Creator {
    constructor(args) {
        this.address = args.address;
        this.verified = args.verified;
        this.share = args.share;
    }
}
exports.Creator = Creator;
class Data {
    constructor(args) {
        this.name = args.name;
        this.symbol = args.symbol;
        this.uri = args.uri;
        this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
        this.creators = args.creators;
    }
}
exports.Data = Data;
class Metadata {
    constructor(args) {
        var _a;
        this.key = MetadataKey.MetadataV1;
        this.updateAuthority = args.updateAuthority;
        this.mint = args.mint;
        this.data = args.data;
        this.primarySaleHappened = args.primarySaleHappened;
        this.isMutable = args.isMutable;
        this.editionNonce = (_a = args.editionNonce) !== null && _a !== void 0 ? _a : null;
    }
    async init() {
        //const metadata = toPublicKey(programIds().metadata);
        /*
        This nonce stuff doesnt work - we are doing something wrong here. TODO fix.
        if (this.editionNonce !== null) {
          this.edition = (
            await PublicKey.createProgramAddress(
              [
                Buffer.from(METADATA_PREFIX),
                metadata.toBuffer(),
                toPublicKey(this.mint).toBuffer(),
                new Uint8Array([this.editionNonce || 0]),
              ],
              metadata,
            )
          ).toBase58();
        } else {*/
        this.edition = await getEdition(this.mint);
        //}
        this.masterEdition = this.edition;
    }
}
exports.Metadata = Metadata;
class CreateMetadataArgs {
    constructor(args) {
        this.instruction = 0;
        this.data = args.data;
        this.isMutable = args.isMutable;
    }
}
class UpdateMetadataArgs {
    constructor(args) {
        this.instruction = 1;
        this.data = args.data ? args.data : null;
        this.updateAuthority = args.updateAuthority ? args.updateAuthority : null;
        this.primarySaleHappened = args.primarySaleHappened;
    }
}
class CreateMasterEditionArgs {
    constructor(args) {
        this.instruction = 10;
        this.maxSupply = args.maxSupply;
    }
}
class MintPrintingTokensArgs {
    constructor(args) {
        this.instruction = 9;
        this.supply = args.supply;
    }
}
exports.METADATA_SCHEMA = new Map([
    [
        CreateMetadataArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['data', Data],
                ['isMutable', 'u8'], // bool
            ],
        },
    ],
    [
        UpdateMetadataArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['data', { kind: 'option', type: Data }],
                ['updateAuthority', { kind: 'option', type: 'pubkeyAsString' }],
                ['primarySaleHappened', { kind: 'option', type: 'u8' }],
            ],
        },
    ],
    [
        CreateMasterEditionArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['maxSupply', { kind: 'option', type: 'u64' }],
            ],
        },
    ],
    [
        MintPrintingTokensArgs,
        {
            kind: 'struct',
            fields: [
                ['instruction', 'u8'],
                ['supply', 'u64'],
            ],
        },
    ],
    [
        MasterEditionV1,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['supply', 'u64'],
                ['maxSupply', { kind: 'option', type: 'u64' }],
                ['printingMint', 'pubkeyAsString'],
                ['oneTimePrintingAuthorizationMint', 'pubkeyAsString'],
            ],
        },
    ],
    [
        MasterEditionV2,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['supply', 'u64'],
                ['maxSupply', { kind: 'option', type: 'u64' }],
            ],
        },
    ],
    [
        Edition,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['parent', 'pubkeyAsString'],
                ['edition', 'u64'],
            ],
        },
    ],
    [
        Data,
        {
            kind: 'struct',
            fields: [
                ['name', 'string'],
                ['symbol', 'string'],
                ['uri', 'string'],
                ['sellerFeeBasisPoints', 'u16'],
                ['creators', { kind: 'option', type: [Creator] }],
            ],
        },
    ],
    [
        Creator,
        {
            kind: 'struct',
            fields: [
                ['address', 'pubkeyAsString'],
                ['verified', 'u8'],
                ['share', 'u8'],
            ],
        },
    ],
    [
        Metadata,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['updateAuthority', 'pubkeyAsString'],
                ['mint', 'pubkeyAsString'],
                ['data', Data],
                ['primarySaleHappened', 'u8'],
                ['isMutable', 'u8'],
                ['editionNonce', { kind: 'option', type: 'u8' }],
            ],
        },
    ],
    [
        EditionMarker,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['ledger', [31]],
            ],
        },
    ],
]);
// eslint-disable-next-line no-control-regex
const METADATA_REPLACE = new RegExp('\u0000', 'g');
const decodeMetadata = (buffer) => {
    const metadata = (0, borsh_1.deserializeUnchecked)(exports.METADATA_SCHEMA, Metadata, buffer);
    metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, '');
    metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, '');
    metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, '');
    return metadata;
};
exports.decodeMetadata = decodeMetadata;
const decodeEditionMarker = (buffer) => {
    const editionMarker = (0, borsh_1.deserializeUnchecked)(exports.METADATA_SCHEMA, EditionMarker, buffer);
    return editionMarker;
};
exports.decodeEditionMarker = decodeEditionMarker;
const decodeEdition = (buffer) => {
    return (0, borsh_1.deserializeUnchecked)(exports.METADATA_SCHEMA, Edition, buffer);
};
exports.decodeEdition = decodeEdition;
const decodeMasterEdition = (buffer) => {
    if (buffer[0] == MetadataKey.MasterEditionV1) {
        return (0, borsh_1.deserializeUnchecked)(exports.METADATA_SCHEMA, MasterEditionV1, buffer);
    }
    else {
        return (0, borsh_1.deserializeUnchecked)(exports.METADATA_SCHEMA, MasterEditionV2, buffer);
    }
};
exports.decodeMasterEdition = decodeMasterEdition;
async function updateMetadata(data, newUpdateAuthority, primarySaleHappened, mintKey, updateAuthority, instructions, metadataAccount) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    metadataAccount =
        metadataAccount ||
            (await (0, utils_1.findProgramAddress)([
                Buffer.from('metadata'),
                (0, utils_1.toPublicKey)(metadataProgramId).toBuffer(),
                (0, utils_1.toPublicKey)(mintKey).toBuffer(),
            ], (0, utils_1.toPublicKey)(metadataProgramId)))[0];
    const value = new UpdateMetadataArgs({
        data,
        updateAuthority: !newUpdateAuthority ? undefined : newUpdateAuthority,
        primarySaleHappened: primarySaleHappened === null || primarySaleHappened === undefined
            ? null
            : primarySaleHappened,
    });
    const txnData = Buffer.from((0, borsh_1.serialize)(exports.METADATA_SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(metadataAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(updateAuthority),
            isSigner: true,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data: txnData,
    }));
    return metadataAccount;
}
exports.updateMetadata = updateMetadata;
async function createMetadata(data, updateAuthority, mintKey, mintAuthorityKey, instructions, payer) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const metadataAccount = (await (0, utils_1.findProgramAddress)([
        Buffer.from('metadata'),
        (0, utils_1.toPublicKey)(metadataProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(mintKey).toBuffer(),
    ], (0, utils_1.toPublicKey)(metadataProgramId)))[0];
    console.log('Data', data);
    const value = new CreateMetadataArgs({ data, isMutable: true });
    const txnData = Buffer.from((0, borsh_1.serialize)(exports.METADATA_SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(metadataAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(mintKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(mintAuthorityKey),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(updateAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data: txnData,
    }));
    return metadataAccount;
}
exports.createMetadata = createMetadata;
async function createMasterEdition(maxSupply, mintKey, updateAuthorityKey, mintAuthorityKey, payer, instructions) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const metadataAccount = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METADATA_PREFIX),
        (0, utils_1.toPublicKey)(metadataProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(mintKey).toBuffer(),
    ], (0, utils_1.toPublicKey)(metadataProgramId)))[0];
    const editionAccount = (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METADATA_PREFIX),
        (0, utils_1.toPublicKey)(metadataProgramId).toBuffer(),
        (0, utils_1.toPublicKey)(mintKey).toBuffer(),
        Buffer.from(exports.EDITION),
    ], (0, utils_1.toPublicKey)(metadataProgramId)))[0];
    const value = new CreateMasterEditionArgs({ maxSupply: maxSupply || null });
    const data = Buffer.from((0, borsh_1.serialize)(exports.METADATA_SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(editionAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(mintKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(updateAuthorityKey),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(mintAuthorityKey),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(metadataAccount),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, programIds_1.programIds)().token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.createMasterEdition = createMasterEdition;
async function deprecatedMintNewEditionFromMasterEditionViaPrintingToken(newMint, tokenMint, newMintAuthority, printingMint, authorizationTokenHoldingAccount, burnAuthority, updateAuthorityOfMaster, reservationList, instructions, payer) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const newMetadataKey = await getMetadata(newMint);
    const masterMetadataKey = await getMetadata(tokenMint);
    const newEdition = await getEdition(newMint);
    const masterEdition = await getEdition(tokenMint);
    const data = Buffer.from([3]);
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(newMetadataKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newEdition),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newMintAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(printingMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(authorizationTokenHoldingAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(burnAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(updateAuthorityOfMaster),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(masterMetadataKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, programIds_1.programIds)().token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    if (reservationList) {
        keys.push({
            pubkey: (0, utils_1.toPublicKey)(reservationList),
            isSigner: false,
            isWritable: true,
        });
    }
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.deprecatedMintNewEditionFromMasterEditionViaPrintingToken = deprecatedMintNewEditionFromMasterEditionViaPrintingToken;
async function mintNewEditionFromMasterEditionViaToken(newMint, tokenMint, newMintAuthority, newUpdateAuthority, tokenOwner, tokenAccount, instructions, payer, edition) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const newMetadataKey = await getMetadata(newMint);
    const masterMetadataKey = await getMetadata(tokenMint);
    const newEdition = await getEdition(newMint);
    const masterEdition = await getEdition(tokenMint);
    const editionMarkPda = await getEditionMarkPda(tokenMint, edition);
    const data = Buffer.from([11, ...edition.toArray('le', 8)]);
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(newMetadataKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newEdition),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(editionMarkPda),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newMintAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenOwner),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenAccount),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newUpdateAuthority),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(masterMetadataKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, programIds_1.programIds)().token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.mintNewEditionFromMasterEditionViaToken = mintNewEditionFromMasterEditionViaToken;
async function updatePrimarySaleHappenedViaToken(metadata, owner, tokenAccount, instructions) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const data = Buffer.from([4]);
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(owner),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenAccount),
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.updatePrimarySaleHappenedViaToken = updatePrimarySaleHappenedViaToken;
async function deprecatedCreateReservationList(metadata, masterEdition, resource, updateAuthority, payer, instructions) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const reservationList = await deprecatedGetReservationList(masterEdition, resource);
    const data = Buffer.from([6]);
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(reservationList),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(updateAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(resource),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.deprecatedCreateReservationList = deprecatedCreateReservationList;
async function signMetadata(metadata, creator, instructions) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const data = Buffer.from([7]);
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(creator),
            isSigner: true,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.signMetadata = signMetadata;
async function deprecatedMintPrintingTokens(destination, printingMint, updateAuthority, metadata, masterEdition, supply, instructions) {
    const PROGRAM_IDS = (0, programIds_1.programIds)();
    const metadataProgramId = PROGRAM_IDS.metadata;
    const value = new MintPrintingTokensArgs({ supply });
    const data = Buffer.from((0, borsh_1.serialize)(exports.METADATA_SCHEMA, value));
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(destination),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(printingMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(updateAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.deprecatedMintPrintingTokens = deprecatedMintPrintingTokens;
async function convertMasterEditionV1ToV2(masterEdition, oneTimeAuthMint, printingMint, instructions) {
    const metadataProgramId = (0, programIds_1.programIds)().metadata;
    const data = Buffer.from([12]);
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(masterEdition),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(oneTimeAuthMint),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(printingMint),
            isSigner: false,
            isWritable: true,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(metadataProgramId),
        data,
    }));
}
exports.convertMasterEditionV1ToV2 = convertMasterEditionV1ToV2;
async function getEdition(tokenMint) {
    const PROGRAM_IDS = (0, programIds_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METADATA_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata).toBuffer(),
        (0, utils_1.toPublicKey)(tokenMint).toBuffer(),
        Buffer.from(exports.EDITION),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata)))[0];
}
exports.getEdition = getEdition;
async function getMetadata(tokenMint) {
    const PROGRAM_IDS = (0, programIds_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METADATA_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata).toBuffer(),
        (0, utils_1.toPublicKey)(tokenMint).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata)))[0];
}
exports.getMetadata = getMetadata;
async function deprecatedGetReservationList(masterEdition, resource) {
    const PROGRAM_IDS = (0, programIds_1.programIds)();
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METADATA_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata).toBuffer(),
        (0, utils_1.toPublicKey)(masterEdition).toBuffer(),
        Buffer.from(exports.RESERVATION),
        (0, utils_1.toPublicKey)(resource).toBuffer(),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata)))[0];
}
exports.deprecatedGetReservationList = deprecatedGetReservationList;
async function getEditionMarkPda(mint, edition) {
    const PROGRAM_IDS = (0, programIds_1.programIds)();
    const editionNumber = Math.floor(edition.toNumber() / 248);
    return (await (0, utils_1.findProgramAddress)([
        Buffer.from(exports.METADATA_PREFIX),
        (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata).toBuffer(),
        (0, utils_1.toPublicKey)(mint).toBuffer(),
        Buffer.from(exports.EDITION),
        Buffer.from(editionNumber.toString()),
    ], (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata)))[0];
}
exports.getEditionMarkPda = getEditionMarkPda;
//# sourceMappingURL=metadata.js.map