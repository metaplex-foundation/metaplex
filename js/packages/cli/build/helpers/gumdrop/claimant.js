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
exports.closeGumdrop = exports.buildGumdrop = exports.chunk = exports.validateEditionClaims = exports.validateCandyClaims = exports.validateTransferClaims = exports.dropInfoFor = exports.getCreatorTokenAccount = exports.getMintInfo = exports.getCandyMachine = exports.getCandyConfig = exports.parseClaimants = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const anchor = __importStar(require("@project-serum/anchor"));
const js_sha256_1 = require("js-sha256");
const bn_js_1 = __importDefault(require("bn.js"));
const bs58 = __importStar(require("bs58"));
const accounts_1 = require("../accounts");
const constants_1 = require("../constants");
const merkleTree_1 = require("./merkleTree");
const csvStringToArray = (strData) => {
    const objPattern = new RegExp('(\\,|\\r?\\n|\\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^\\,\\r\\n]*))', 'gi');
    let arrMatches = null;
    const arrData = [[]];
    while ((arrMatches = objPattern.exec(strData))) {
        if (arrMatches[1].length && arrMatches[1] !== ',')
            arrData.push([]);
        arrData[arrData.length - 1].push(arrMatches[2]
            ? arrMatches[2].replace(new RegExp('""', 'g'), '"')
            : arrMatches[3]);
    }
    return arrData;
};
const parseClaimants = (input, filename, method) => {
    const extension = filename.match(/\.[0-9a-z]+$/i);
    if (extension === null) {
        throw new Error(`Could not parse file extension from ${filename}`);
    }
    switch (extension[0]) {
        case '.csv': {
            const arr = csvStringToArray(input);
            // TODO: more robust
            let search;
            if (method === 'aws-sms') {
                search = 'phone number';
            }
            else if (method === 'aws-email') {
                search = 'email';
            }
            else {
                throw new Error(`Cannot parse csv for ${method}`);
            }
            const foundIdx = arr[0].findIndex(s => s.includes(search));
            if (foundIdx === -1)
                throw new Error(`Could not find ${search} index`);
            const numbers = new Set(arr
                .slice(1)
                .filter(arr => arr[foundIdx].length > 0)
                .map(arr => arr[foundIdx]));
            return [...numbers].map((n, idx) => {
                return {
                    handle: n,
                    amount: 1,
                    edition: idx,
                };
            });
        }
        case '.json': {
            const json = JSON.parse(input);
            return json.map((obj) => {
                return {
                    handle: obj.handle,
                    amount: obj.amount,
                    edition: obj.edition,
                    url: obj.url,
                };
            });
        }
        default: {
            throw new Error(`Cannot parse file format ${extension} from ${filename}`);
        }
    }
};
exports.parseClaimants = parseClaimants;
const getCandyConfig = async (connection, config) => {
    let configKey;
    try {
        configKey = new web3_js_1.PublicKey(config);
    }
    catch (err) {
        throw new Error(`Invalid config key ${err}`);
    }
    const configAccount = await connection.getAccountInfo(configKey);
    if (configAccount === null) {
        throw new Error(`Could not fetch config`);
    }
    if (!configAccount.owner.equals(constants_1.CANDY_MACHINE_PROGRAM_ID)) {
        throw new Error(`Invalid config owner ${configAccount.owner.toBase58()}`);
    }
    return configKey;
};
exports.getCandyConfig = getCandyConfig;
const getCandyMachine = async (connection, candyMachineKey) => {
    const candyMachineCoder = new anchor.Coder(await anchor.Program.fetchIdl(constants_1.CANDY_MACHINE_PROGRAM_ID, {
        connection: connection,
    }));
    if (candyMachineCoder === null) {
        throw new Error(`Could not fetch candy machine IDL`);
    }
    const candyMachineAccount = await connection.getAccountInfo(candyMachineKey);
    if (candyMachineAccount === null) {
        throw new Error(`Could not fetch candy machine`);
    }
    return candyMachineCoder.accounts.decode('CandyMachine', candyMachineAccount.data);
};
exports.getCandyMachine = getCandyMachine;
const getMintInfo = async (connection, mint) => {
    let mintKey;
    try {
        mintKey = new web3_js_1.PublicKey(mint);
    }
    catch (err) {
        throw new Error(`Invalid mint key ${err}`);
    }
    const mintAccount = await connection.getAccountInfo(mintKey);
    if (mintAccount === null) {
        throw new Error(`Could not fetch mint`);
    }
    if (!mintAccount.owner.equals(constants_1.TOKEN_PROGRAM_ID)) {
        const mintOwner = mintAccount.owner.toBase58();
        throw new Error(`Invalid mint owner ${mintOwner}`);
    }
    if (mintAccount.data.length !== spl_token_1.MintLayout.span) {
        throw new Error(`Invalid mint size ${mintAccount.data.length}`);
    }
    const mintInfo = spl_token_1.MintLayout.decode(Buffer.from(mintAccount.data));
    return {
        key: mintKey,
        info: mintInfo,
    };
};
exports.getMintInfo = getMintInfo;
const getCreatorTokenAccount = async (walletKey, connection, mintKey, totalClaim) => {
    const creatorTokenKey = await (0, accounts_1.getTokenWallet)(walletKey, mintKey);
    const creatorTokenAccount = await connection.getAccountInfo(creatorTokenKey);
    if (creatorTokenAccount === null) {
        throw new Error(`Could not fetch creator token account`);
    }
    if (creatorTokenAccount.data.length !== spl_token_1.AccountLayout.span) {
        throw new Error(`Invalid token account size ${creatorTokenAccount.data.length}`);
    }
    const creatorTokenInfo = spl_token_1.AccountLayout.decode(Buffer.from(creatorTokenAccount.data));
    if (new bn_js_1.default(creatorTokenInfo.amount, 8, 'le').toNumber() < totalClaim) {
        throw new Error(`Creator token account does not have enough tokens`);
    }
    return creatorTokenKey;
};
exports.getCreatorTokenAccount = getCreatorTokenAccount;
const explorerUrlFor = (env, key) => {
    return `https://explorer.solana.com/address/${key}?cluster=${env}`;
};
const dropInfoFor = (env, integration, tokenMint, candyConfig, masterMint) => {
    switch (integration) {
        case 'transfer':
            return { type: 'Token', meta: explorerUrlFor(env, tokenMint) };
        case 'candy':
            return { type: 'Candy', meta: explorerUrlFor(env, candyConfig) };
        case 'edition':
            return { type: 'Edition', meta: explorerUrlFor(env, masterMint) };
        default:
            throw new Error(`Unknown claim integration method ${integration}`);
    }
};
exports.dropInfoFor = dropInfoFor;
const validateTransferClaims = async (connection, walletKey, claimants, mintStr) => {
    claimants.forEach((c, idx) => {
        if (!c.handle)
            throw new Error(`Claimant ${idx} doesn't have handle`);
        if (!c.amount)
            throw new Error(`Claimant ${idx} doesn't have amount`);
        if (c.amount === 0)
            throw new Error(`Claimant ${idx} amount is 0`);
    });
    const total = claimants.reduce((acc, c) => acc + c.amount, 0);
    const mint = await (0, exports.getMintInfo)(connection, mintStr);
    const source = await (0, exports.getCreatorTokenAccount)(walletKey, connection, mint.key, total);
    return {
        total: total,
        mint: mint,
        source: source,
    };
};
exports.validateTransferClaims = validateTransferClaims;
const validateCandyClaims = async (connection, walletKey, claimants, candyConfig, candyUuid) => {
    claimants.forEach((c, idx) => {
        if (!c.handle)
            throw new Error(`Claimant ${idx} doesn't have handle`);
        if (!c.amount)
            throw new Error(`Claimant ${idx} doesn't have amount`);
        if (c.amount === 0)
            throw new Error(`Claimant ${idx} amount is 0`);
    });
    const total = claimants.reduce((acc, c) => acc + c.amount, 0);
    const configKey = await (0, exports.getCandyConfig)(connection, candyConfig);
    const [candyMachineKey] = await (0, accounts_1.getCandyMachineAddress)(configKey, candyUuid);
    const candyMachine = await (0, exports.getCandyMachine)(connection, candyMachineKey);
    const remaining = candyMachine.data.itemsAvailable.toNumber() -
        candyMachine.itemsRedeemed.toNumber();
    if (isNaN(remaining)) {
        // TODO: should this have an override?
        throw new Error(`Could not calculate how many candy machine items are remaining`);
    }
    if (remaining < total) {
        throw new Error(`Distributor is allocated more mints (${total}) ` +
            `than the candy machine has remaining (${remaining})`);
    }
    if (!candyMachine.authority.equals(walletKey)) {
        throw new Error(`Candy machine authority does not match wallet public key`);
    }
    return {
        total: total,
        config: configKey,
        uuid: candyUuid,
        candyMachineKey: candyMachineKey,
    };
};
exports.validateCandyClaims = validateCandyClaims;
const getOffsetFromStart = (edition) => {
    return edition.mod(new bn_js_1.default(31 * 8));
};
const getIndex = (offsetFromStart) => {
    return offsetFromStart.div(new bn_js_1.default(8));
};
const getOffsetFromRight = (offsetFromStart) => {
    return new bn_js_1.default(7).sub(offsetFromStart.mod(new bn_js_1.default(8)));
};
const getIndexAndMask = (edition) => {
    const offsetFromStart = getOffsetFromStart(edition);
    return {
        index: getIndex(offsetFromStart).toNumber(),
        mask: new bn_js_1.default(1)
            .shln(getOffsetFromRight(offsetFromStart).toNumber())
            .toNumber(),
    };
};
const editionTaken = (marker, edition) => {
    const m = getIndexAndMask(edition);
    return (marker[m.index] & m.mask) !== 0;
};
const setEditionTaken = (marker, edition) => {
    const m = getIndexAndMask(edition);
    marker[m.index] = marker[m.index] | m.mask;
};
const validateEditionClaims = async (connection, walletKey, claimants, masterMintStr) => {
    claimants.forEach((c, idx) => {
        if (!c.handle)
            throw new Error(`Claimant ${idx} doesn't have handle`);
        if (c.amount !== 1) {
            throw new Error(`Claimant ${idx} has amount ${c.amount}. Expected 1 for edition gumdrop`);
        }
    });
    const total = claimants.reduce((acc, c) => acc + c.amount, 0);
    const masterMint = await (0, exports.getMintInfo)(connection, masterMintStr);
    const masterTokenAccount = await (0, exports.getCreatorTokenAccount)(walletKey, connection, masterMint.key, 1);
    const masterEditionKey = await (0, accounts_1.getMasterEdition)(masterMint.key);
    const masterEdition = await connection.getAccountInfo(masterEditionKey);
    if (masterEdition === null) {
        throw new Error(`Could not fetch master edition`);
    }
    console.log('Master edition', masterEdition);
    // maxSupply is an option, 9 bytes, first is 0 means is none
    const currentSupply = new bn_js_1.default(masterEdition.data.slice(1, 1 + 8), 8, 'le').toNumber();
    let maxSupply;
    if (masterEdition.data[9] === 0) {
        maxSupply = null;
    }
    else {
        maxSupply = new bn_js_1.default(masterEdition.data.slice(10, 10 + 8), 8, 'le').toNumber();
    }
    console.log('Max supply', maxSupply);
    console.log('Current supply', currentSupply);
    if (maxSupply !== null && maxSupply < total) {
        throw new Error(`Distributor is allocated more editions (${total}) ` +
            `than the master has total (${maxSupply})`);
    }
    // Whether an edition has been claimed is a single bit in a paginated account
    // (pda off of master mint). The following code does some sanity checks
    // around max supply and internally whether the distribution list has
    // duplicate editions, and also checks if the editions were already taken on
    // chain.
    //
    // There is a race condition since the authority to mint is still currently
    // the wallet but it seems like a user error to have other editions being
    // minted while a gumdrop is being created
    const editions = {};
    const editionMarkers = [];
    for (let idx = 0; idx < claimants.length; ++idx) {
        const c = claimants[idx];
        if (c.edition === undefined)
            throw new Error(`Claimant ${idx} doesn't have edition`);
        if (c.edition <= 0) {
            throw new Error(`Claimant ${idx} assigned invalid edition ${c.edition}`);
        }
        if (maxSupply !== null && c.edition > maxSupply) {
            throw new Error(`Claimant ${idx} assigned edition ${c.edition} which is beyond the max supply`);
        }
        if (c.edition in editions) {
            throw new Error(`Claimant ${idx} and ${editions[c.edition]} are both assigned to edition ${c.edition}`);
        }
        const edition = new bn_js_1.default(c.edition);
        const markerKey = await (0, accounts_1.getEditionMarkPda)(masterMint.key, edition.toNumber());
        let markerData = editionMarkers.find(pm => pm[0].equals(markerKey));
        if (markerData === undefined) {
            const markerAcc = await connection.getAccountInfo(markerKey);
            if (markerAcc === null) {
                editionMarkers.push([markerKey, Array(31)]);
            }
            else {
                editionMarkers.push([markerKey, [...markerAcc.data.slice(1, 32)]]);
            }
            markerData = editionMarkers[editionMarkers.length - 1];
        }
        if (markerData === undefined) {
            throw new Error(`Internal Error: Edition marker info still undefined ${c.edition}`);
        }
        if (editionTaken(markerData[1], edition)) {
            throw new Error(`Claimant ${idx} is assigned to edition ${c.edition} which is already taken`);
        }
        setEditionTaken(markerData[1], edition);
        editions[c.edition] = idx;
    }
    return {
        total: total,
        masterMint: masterMint,
        masterTokenAccount: masterTokenAccount,
    };
};
exports.validateEditionClaims = validateEditionClaims;
const chunk = (arr, len) => {
    const chunks = [];
    const n = arr.length;
    let i = 0;
    while (i < n) {
        chunks.push(arr.slice(i, (i += len)));
    }
    return chunks;
};
exports.chunk = chunk;
const buildGumdrop = async (connection, walletKey, commMethod, claimIntegration, host, baseKey, temporalSigner, claimants, claimInfo, extraParams = []) => {
    const needsPin = commMethod !== "wallets";
    const leafs = [];
    for (let idx = 0; idx < claimants.length; ++idx) {
        const claimant = claimants[idx];
        if (!needsPin) {
            try {
                claimant.secret = new web3_js_1.PublicKey(claimant.handle);
            }
            catch (err) {
                throw new Error(`Invalid claimant wallet handle ${err}`);
            }
        }
        else {
            const seeds = [
                claimant.seed.toBuffer(),
                ...(0, exports.chunk)(Buffer.from(claimant.handle), 32),
                Buffer.from(claimant.pin.toArray('le', 4)),
            ];
            const [claimantPda] = await web3_js_1.PublicKey.findProgramAddress(seeds.map(s => s.slice(0, 32)), constants_1.GUMDROP_DISTRIBUTOR_ID);
            claimant.secret = claimantPda;
        }
        // TODO: get this clarified with jordan... we can either just assign some
        // range of editions to a user or give them an amount and just keep a
        // counter on the distributor... the latter is much less work but we lose
        // the ability to use gumdrop for auction house winnings and such?
        const extra = claimIntegration === 'edition'
            ? [...new bn_js_1.default(claimant.edition).toArray('le', 8)]
            : [];
        leafs.push(Buffer.from([
            ...new bn_js_1.default(idx).toArray('le', 8),
            ...claimant.secret.toBuffer(),
            ...claimant.seed.toBuffer(),
            ...new bn_js_1.default(claimant.amount).toArray('le', 8),
            ...extra,
        ]));
    }
    const tree = new merkleTree_1.MerkleTree(leafs);
    const root = tree.getRoot();
    const [distributor, dbump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('MerkleDistributor'), baseKey.toBuffer()], constants_1.GUMDROP_DISTRIBUTOR_ID);
    for (let idx = 0; idx < claimants.length; ++idx) {
        const proof = tree.getProof(idx);
        const verified = tree.verifyProof(idx, proof, root);
        if (!verified) {
            throw new Error('Gumdrop merkle tree verification failed');
        }
        const claimant = claimants[idx];
        const params = [
            `distributor=${distributor}`,
            `method=${commMethod}`,
            `handle=${encodeURIComponent(claimant.handle)}`,
            `amount=${claimant.amount}`,
            `index=${idx}`,
            `proof=${proof.map(b => bs58.encode(b))}`,
            ...extraParams,
        ];
        if (needsPin) {
            params.push(`pin=${claimant.pin.toNumber()}`);
        }
        else {
            params.push(`pin=NA`);
        }
        if (claimIntegration === 'transfer') {
            params.push(`tokenAcc=${claimInfo.source}`);
        }
        else if (claimIntegration === 'candy') {
            params.push(`config=${claimInfo.config}`);
            params.push(`uuid=${claimInfo.uuid}`);
        }
        else {
            params.push(`master=${claimInfo.masterMint.key}`);
            params.push(`edition=${claimant.edition}`);
        }
        const query = params.join('&');
        claimant.url = `${host}/claim?${query}`;
    }
    // initial merkle-distributor state
    const instructions = Array();
    instructions.push(new web3_js_1.TransactionInstruction({
        programId: constants_1.GUMDROP_DISTRIBUTOR_ID,
        keys: [
            { pubkey: baseKey, isSigner: true, isWritable: false },
            { pubkey: distributor, isSigner: false, isWritable: true },
            { pubkey: walletKey, isSigner: true, isWritable: false },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([
            ...Buffer.from(js_sha256_1.sha256.digest('global:new_distributor')).slice(0, 8),
            ...new bn_js_1.default(dbump).toArray('le', 1),
            ...root,
            ...temporalSigner.toBuffer(),
        ]),
    }));
    if (claimIntegration === 'transfer') {
        instructions.push(spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, claimInfo.source, distributor, walletKey, [], claimInfo.total));
    }
    else if (claimIntegration === 'candy') {
        const [distributorWalletKey] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('Wallet'), distributor.toBuffer()], constants_1.GUMDROP_DISTRIBUTOR_ID);
        instructions.push(new web3_js_1.TransactionInstruction({
            programId: constants_1.CANDY_MACHINE_PROGRAM_ID,
            keys: [
                {
                    pubkey: claimInfo.candyMachineKey,
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: walletKey, isSigner: true, isWritable: false },
            ],
            data: Buffer.from([
                ...Buffer.from(js_sha256_1.sha256.digest('global:update_authority')).slice(0, 8),
                ...new bn_js_1.default(1).toArray('le', 1),
                ...distributorWalletKey.toBuffer(),
            ]),
        }));
    }
    else if (claimIntegration === 'edition') {
        // transfer master edition to distributor
        const [distributorTokenKey] = await web3_js_1.PublicKey.findProgramAddress([
            distributor.toBuffer(),
            constants_1.TOKEN_PROGRAM_ID.toBuffer(),
            claimInfo.masterMint.key.toBuffer(),
        ], constants_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID);
        instructions.push(spl_token_1.Token.createAssociatedTokenAccountInstruction(constants_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID, constants_1.TOKEN_PROGRAM_ID, claimInfo.masterMint.key, distributorTokenKey, distributor, walletKey));
        instructions.push(spl_token_1.Token.createTransferInstruction(constants_1.TOKEN_PROGRAM_ID, claimInfo.masterTokenAccount, distributorTokenKey, walletKey, [], 1));
    }
    return instructions;
};
exports.buildGumdrop = buildGumdrop;
const closeGumdrop = async (connection, walletKey, base, claimMethod, transferMint, candyConfig, candyUuid, masterMint) => {
    const [distributorKey, dbump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('MerkleDistributor'), base.publicKey.toBuffer()], constants_1.GUMDROP_DISTRIBUTOR_ID);
    const [distributorWalletKey, wbump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('Wallet'), distributorKey.toBuffer()], constants_1.GUMDROP_DISTRIBUTOR_ID);
    let extraKeys;
    const instructions = Array();
    if (claimMethod === 'transfer') {
        const mint = await (0, exports.getMintInfo)(connection, transferMint);
        const source = await (0, exports.getCreatorTokenAccount)(walletKey, connection, mint.key, 0);
        // distributor is about to be closed anyway so this is redundant but...
        instructions.push(spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, source, walletKey, []));
    }
    if (claimMethod === 'candy') {
        const configKey = await (0, exports.getCandyConfig)(connection, candyConfig);
        const [candyMachineKey] = await (0, accounts_1.getCandyMachineAddress)(configKey, candyUuid);
        extraKeys = [
            { pubkey: candyMachineKey, isSigner: false, isWritable: true },
            { pubkey: constants_1.CANDY_MACHINE_PROGRAM_ID, isSigner: false, isWritable: false },
        ];
    }
    else {
        extraKeys = [];
    }
    if (claimMethod === 'edition') {
        let masterMintKey;
        try {
            masterMintKey = new web3_js_1.PublicKey(masterMint);
        }
        catch (err) {
            throw new Error(`Invalid mint key ${err}`);
        }
        const [distributorTokenKey] = await web3_js_1.PublicKey.findProgramAddress([
            distributorKey.toBuffer(),
            constants_1.TOKEN_PROGRAM_ID.toBuffer(),
            masterMintKey.toBuffer(),
        ], constants_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID);
        const [walletTokenKey] = await web3_js_1.PublicKey.findProgramAddress([
            walletKey.toBuffer(),
            constants_1.TOKEN_PROGRAM_ID.toBuffer(),
            masterMintKey.toBuffer(),
        ], constants_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID);
        instructions.push(new web3_js_1.TransactionInstruction({
            programId: constants_1.GUMDROP_DISTRIBUTOR_ID,
            keys: [
                { pubkey: base.publicKey, isSigner: true, isWritable: false },
                { pubkey: distributorKey, isSigner: false, isWritable: false },
                { pubkey: distributorTokenKey, isSigner: false, isWritable: true },
                { pubkey: walletTokenKey, isSigner: false, isWritable: true },
                { pubkey: walletKey, isSigner: false, isWritable: true },
                {
                    pubkey: web3_js_1.SystemProgram.programId,
                    isSigner: false,
                    isWritable: false,
                },
                { pubkey: constants_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: Buffer.from([
                ...Buffer.from(js_sha256_1.sha256.digest('global:close_distributor_token_account')).slice(0, 8),
                ...new bn_js_1.default(dbump).toArray('le', 1),
            ]),
        }));
    }
    instructions.push(new web3_js_1.TransactionInstruction({
        programId: constants_1.GUMDROP_DISTRIBUTOR_ID,
        keys: [
            { pubkey: base.publicKey, isSigner: true, isWritable: false },
            { pubkey: distributorKey, isSigner: false, isWritable: true },
            { pubkey: distributorWalletKey, isSigner: false, isWritable: true },
            { pubkey: walletKey, isSigner: true, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: constants_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ...extraKeys,
        ],
        data: Buffer.from([
            ...Buffer.from(js_sha256_1.sha256.digest('global:close_distributor')).slice(0, 8),
            ...new bn_js_1.default(dbump).toArray('le', 1),
            ...new bn_js_1.default(wbump).toArray('le', 1),
        ]),
    }));
    return instructions;
};
exports.closeGumdrop = closeGumdrop;
