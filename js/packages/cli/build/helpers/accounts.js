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
exports.getProgramAccounts = exports.getBalance = exports.getTokenAmount = exports.loadTokenEntanglementProgream = exports.loadAuctionHouseProgram = exports.loadFairLaunchProgram = exports.loadCandyProgramV2 = exports.loadCandyProgram = exports.loadWalletKey = exports.getTokenEntanglementEscrows = exports.getTokenEntanglement = exports.getAuctionHouseTradeState = exports.getAuctionHouseBuyerEscrow = exports.getAuctionHouseTreasuryAcct = exports.getAuctionHouseFeeAcct = exports.getAuctionHouseProgramAsSigner = exports.getAuctionHouse = exports.getEditionMarkPda = exports.getMasterEdition = exports.getMetadata = exports.getTreasury = exports.getParticipationToken = exports.getParticipationMint = exports.getAtaForMint = exports.getFairLaunchTicketSeqLookup = exports.getFairLaunchLotteryBitmap = exports.getFairLaunchTicket = exports.getCandyMachineCreator = exports.getFairLaunch = exports.getTokenMint = exports.getConfig = exports.deriveCandyMachineV2ProgramAddress = exports.getCandyMachineAddress = exports.getTokenWallet = exports.uuidFromConfigPubkey = exports.createConfig = exports.createCandyMachineV2 = exports.WhitelistMintMode = exports.deserializeAccount = void 0;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
const anchor = __importStar(require("@project-serum/anchor"));
const fs_1 = __importDefault(require("fs"));
const instructions_1 = require("./instructions");
const loglevel_1 = __importDefault(require("loglevel"));
const spl_token_1 = require("@solana/spl-token");
const various_1 = require("./various");
// TODO: expose in spl package
const deserializeAccount = (data) => {
    const accountInfo = spl_token_1.AccountLayout.decode(data);
    accountInfo.mint = new web3_js_1.PublicKey(accountInfo.mint);
    accountInfo.owner = new web3_js_1.PublicKey(accountInfo.owner);
    accountInfo.amount = spl_token_1.u64.fromBuffer(accountInfo.amount);
    if (accountInfo.delegateOption === 0) {
        accountInfo.delegate = null;
        accountInfo.delegatedAmount = new spl_token_1.u64(0);
    }
    else {
        accountInfo.delegate = new web3_js_1.PublicKey(accountInfo.delegate);
        accountInfo.delegatedAmount = spl_token_1.u64.fromBuffer(accountInfo.delegatedAmount);
    }
    accountInfo.isInitialized = accountInfo.state !== 0;
    accountInfo.isFrozen = accountInfo.state === 2;
    if (accountInfo.isNativeOption === 1) {
        accountInfo.rentExemptReserve = spl_token_1.u64.fromBuffer(accountInfo.isNative);
        accountInfo.isNative = true;
    }
    else {
        accountInfo.rentExemptReserve = null;
        accountInfo.isNative = false;
    }
    if (accountInfo.closeAuthorityOption === 0) {
        accountInfo.closeAuthority = null;
    }
    else {
        accountInfo.closeAuthority = new web3_js_1.PublicKey(accountInfo.closeAuthority);
    }
    return accountInfo;
};
exports.deserializeAccount = deserializeAccount;
var WhitelistMintMode;
(function (WhitelistMintMode) {
    WhitelistMintMode[WhitelistMintMode["BurnEveryTime"] = 0] = "BurnEveryTime";
    WhitelistMintMode[WhitelistMintMode["NeverBurn"] = 1] = "NeverBurn";
})(WhitelistMintMode = exports.WhitelistMintMode || (exports.WhitelistMintMode = {}));
const createCandyMachineV2 = async function (anchorProgram, payerWallet, treasuryWallet, splToken, candyData) {
    const candyAccount = web3_js_1.Keypair.generate();
    candyData.uuid = uuidFromConfigPubkey(candyAccount.publicKey);
    if (!candyData.creators || candyData.creators.length === 0) {
        throw new Error(`Invalid config, there must be at least one creator.`);
    }
    const totalShare = (candyData.creators || []).reduce((acc, curr) => acc + curr.share, 0);
    if (totalShare !== 100) {
        throw new Error(`Invalid config, creators shares must add up to 100`);
    }
    const remainingAccounts = [];
    if (splToken) {
        remainingAccounts.push({
            pubkey: splToken,
            isSigner: false,
            isWritable: false,
        });
    }
    return {
        candyMachine: candyAccount.publicKey,
        uuid: candyData.uuid,
        txId: await anchorProgram.rpc.initializeCandyMachine(candyData, {
            accounts: {
                candyMachine: candyAccount.publicKey,
                wallet: treasuryWallet,
                authority: payerWallet.publicKey,
                payer: payerWallet.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [payerWallet, candyAccount],
            remainingAccounts: remainingAccounts.length > 0 ? remainingAccounts : undefined,
            instructions: [
                await (0, instructions_1.createCandyMachineV2Account)(anchorProgram, candyData, payerWallet.publicKey, candyAccount.publicKey),
            ],
        }),
    };
};
exports.createCandyMachineV2 = createCandyMachineV2;
const createConfig = async function (anchorProgram, payerWallet, configData) {
    const configAccount = web3_js_1.Keypair.generate();
    const uuid = uuidFromConfigPubkey(configAccount.publicKey);
    if (!configData.creators || configData.creators.length === 0) {
        throw new Error(`Invalid config, there must be at least one creator.`);
    }
    const totalShare = (configData.creators || []).reduce((acc, curr) => acc + curr.share, 0);
    if (totalShare !== 100) {
        throw new Error(`Invalid config, creators shares must add up to 100`);
    }
    return {
        config: configAccount.publicKey,
        uuid,
        txId: await anchorProgram.rpc.initializeConfig({
            uuid,
            ...configData,
        }, {
            accounts: {
                config: configAccount.publicKey,
                authority: payerWallet.publicKey,
                payer: payerWallet.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [payerWallet, configAccount],
            instructions: [
                await (0, instructions_1.createConfigAccount)(anchorProgram, configData, payerWallet.publicKey, configAccount.publicKey),
            ],
        }),
    };
};
exports.createConfig = createConfig;
function uuidFromConfigPubkey(configAccount) {
    return configAccount.toBase58().slice(0, 6);
}
exports.uuidFromConfigPubkey = uuidFromConfigPubkey;
const getTokenWallet = async function (wallet, mint) {
    return (await web3_js_1.PublicKey.findProgramAddress([wallet.toBuffer(), constants_1.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], constants_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID))[0];
};
exports.getTokenWallet = getTokenWallet;
const getCandyMachineAddress = async (config, uuid) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(constants_1.CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)], constants_1.CANDY_MACHINE_PROGRAM_ID);
};
exports.getCandyMachineAddress = getCandyMachineAddress;
const deriveCandyMachineV2ProgramAddress = async (candyMachineId) => {
    return await web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.CANDY_MACHINE), candyMachineId.toBuffer()], constants_1.CANDY_MACHINE_PROGRAM_V2_ID);
};
exports.deriveCandyMachineV2ProgramAddress = deriveCandyMachineV2ProgramAddress;
const getConfig = async (authority, uuid) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(constants_1.CANDY_MACHINE), authority.toBuffer(), Buffer.from(uuid)], constants_1.CANDY_MACHINE_PROGRAM_ID);
};
exports.getConfig = getConfig;
const getTokenMint = async (authority, uuid) => {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from('fair_launch'),
        authority.toBuffer(),
        Buffer.from('mint'),
        Buffer.from(uuid),
    ], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getTokenMint = getTokenMint;
const getFairLaunch = async (tokenMint) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from('fair_launch'), tokenMint.toBuffer()], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getFairLaunch = getFairLaunch;
const getCandyMachineCreator = async (candyMachine) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from('candy_machine'), candyMachine.toBuffer()], constants_1.CANDY_MACHINE_PROGRAM_V2_ID);
};
exports.getCandyMachineCreator = getCandyMachineCreator;
const getFairLaunchTicket = async (tokenMint, buyer) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from('fair_launch'), tokenMint.toBuffer(), buyer.toBuffer()], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getFairLaunchTicket = getFairLaunchTicket;
const getFairLaunchLotteryBitmap = async (tokenMint) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from('fair_launch'), tokenMint.toBuffer(), Buffer.from('lottery')], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getFairLaunchLotteryBitmap = getFairLaunchLotteryBitmap;
const getFairLaunchTicketSeqLookup = async (tokenMint, seq) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from('fair_launch'), tokenMint.toBuffer(), seq.toBuffer('le', 8)], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getFairLaunchTicketSeqLookup = getFairLaunchTicketSeqLookup;
const getAtaForMint = async (mint, buyer) => {
    return await anchor.web3.PublicKey.findProgramAddress([buyer.toBuffer(), constants_1.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], constants_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID);
};
exports.getAtaForMint = getAtaForMint;
const getParticipationMint = async (authority, uuid) => {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from('fair_launch'),
        authority.toBuffer(),
        Buffer.from('mint'),
        Buffer.from(uuid),
        Buffer.from('participation'),
    ], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getParticipationMint = getParticipationMint;
const getParticipationToken = async (authority, uuid) => {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from('fair_launch'),
        authority.toBuffer(),
        Buffer.from('mint'),
        Buffer.from(uuid),
        Buffer.from('participation'),
        Buffer.from('account'),
    ], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getParticipationToken = getParticipationToken;
const getTreasury = async (tokenMint) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from('fair_launch'), tokenMint.toBuffer(), Buffer.from('treasury')], constants_1.FAIR_LAUNCH_PROGRAM_ID);
};
exports.getTreasury = getTreasury;
const getMetadata = async (mint) => {
    return (await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from('metadata'),
        constants_1.TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
    ], constants_1.TOKEN_METADATA_PROGRAM_ID))[0];
};
exports.getMetadata = getMetadata;
const getMasterEdition = async (mint) => {
    return (await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from('metadata'),
        constants_1.TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
    ], constants_1.TOKEN_METADATA_PROGRAM_ID))[0];
};
exports.getMasterEdition = getMasterEdition;
const getEditionMarkPda = async (mint, edition) => {
    const editionNumber = Math.floor(edition / 248);
    return (await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from('metadata'),
        constants_1.TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
        Buffer.from(editionNumber.toString()),
    ], constants_1.TOKEN_METADATA_PROGRAM_ID))[0];
};
exports.getEditionMarkPda = getEditionMarkPda;
const getAuctionHouse = async (creator, treasuryMint) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(constants_1.AUCTION_HOUSE), creator.toBuffer(), treasuryMint.toBuffer()], constants_1.AUCTION_HOUSE_PROGRAM_ID);
};
exports.getAuctionHouse = getAuctionHouse;
const getAuctionHouseProgramAsSigner = async () => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(constants_1.AUCTION_HOUSE), Buffer.from('signer')], constants_1.AUCTION_HOUSE_PROGRAM_ID);
};
exports.getAuctionHouseProgramAsSigner = getAuctionHouseProgramAsSigner;
const getAuctionHouseFeeAcct = async (auctionHouse) => {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(constants_1.AUCTION_HOUSE),
        auctionHouse.toBuffer(),
        Buffer.from(constants_1.FEE_PAYER),
    ], constants_1.AUCTION_HOUSE_PROGRAM_ID);
};
exports.getAuctionHouseFeeAcct = getAuctionHouseFeeAcct;
const getAuctionHouseTreasuryAcct = async (auctionHouse) => {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(constants_1.AUCTION_HOUSE),
        auctionHouse.toBuffer(),
        Buffer.from(constants_1.TREASURY),
    ], constants_1.AUCTION_HOUSE_PROGRAM_ID);
};
exports.getAuctionHouseTreasuryAcct = getAuctionHouseTreasuryAcct;
const getAuctionHouseBuyerEscrow = async (auctionHouse, wallet) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(constants_1.AUCTION_HOUSE), auctionHouse.toBuffer(), wallet.toBuffer()], constants_1.AUCTION_HOUSE_PROGRAM_ID);
};
exports.getAuctionHouseBuyerEscrow = getAuctionHouseBuyerEscrow;
const getAuctionHouseTradeState = async (auctionHouse, wallet, tokenAccount, treasuryMint, tokenMint, tokenSize, buyPrice) => {
    return await anchor.web3.PublicKey.findProgramAddress([
        Buffer.from(constants_1.AUCTION_HOUSE),
        wallet.toBuffer(),
        auctionHouse.toBuffer(),
        tokenAccount.toBuffer(),
        treasuryMint.toBuffer(),
        tokenMint.toBuffer(),
        buyPrice.toBuffer('le', 8),
        tokenSize.toBuffer('le', 8),
    ], constants_1.AUCTION_HOUSE_PROGRAM_ID);
};
exports.getAuctionHouseTradeState = getAuctionHouseTradeState;
const getTokenEntanglement = async (mintA, mintB) => {
    return await anchor.web3.PublicKey.findProgramAddress([Buffer.from(constants_1.TOKEN_ENTANGLER), mintA.toBuffer(), mintB.toBuffer()], constants_1.TOKEN_ENTANGLEMENT_PROGRAM_ID);
};
exports.getTokenEntanglement = getTokenEntanglement;
const getTokenEntanglementEscrows = async (mintA, mintB) => {
    return [
        ...(await anchor.web3.PublicKey.findProgramAddress([
            Buffer.from(constants_1.TOKEN_ENTANGLER),
            mintA.toBuffer(),
            mintB.toBuffer(),
            Buffer.from(constants_1.ESCROW),
            Buffer.from(constants_1.A),
        ], constants_1.TOKEN_ENTANGLEMENT_PROGRAM_ID)),
        ...(await anchor.web3.PublicKey.findProgramAddress([
            Buffer.from(constants_1.TOKEN_ENTANGLER),
            mintA.toBuffer(),
            mintB.toBuffer(),
            Buffer.from(constants_1.ESCROW),
            Buffer.from(constants_1.B),
        ], constants_1.TOKEN_ENTANGLEMENT_PROGRAM_ID)),
    ];
};
exports.getTokenEntanglementEscrows = getTokenEntanglementEscrows;
function loadWalletKey(keypair) {
    if (!keypair || keypair == '') {
        throw new Error('Keypair is required!');
    }
    const loaded = web3_js_1.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs_1.default.readFileSync(keypair).toString())));
    loglevel_1.default.info(`wallet public key: ${loaded.publicKey}`);
    return loaded;
}
exports.loadWalletKey = loadWalletKey;
async function loadCandyProgram(walletKeyPair, env, customRpcUrl) {
    if (customRpcUrl)
        console.log('USING CUSTOM URL', customRpcUrl);
    // @ts-ignore
    const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || (0, various_1.getCluster)(env));
    const walletWrapper = new anchor.Wallet(walletKeyPair);
    const provider = new anchor.Provider(solConnection, walletWrapper, {
        preflightCommitment: 'recent',
    });
    const idl = await anchor.Program.fetchIdl(constants_1.CANDY_MACHINE_PROGRAM_ID, provider);
    const program = new anchor.Program(idl, constants_1.CANDY_MACHINE_PROGRAM_ID, provider);
    loglevel_1.default.debug('program id from anchor', program.programId.toBase58());
    return program;
}
exports.loadCandyProgram = loadCandyProgram;
async function loadCandyProgramV2(walletKeyPair, env, customRpcUrl) {
    if (customRpcUrl)
        console.log('USING CUSTOM URL', customRpcUrl);
    // @ts-ignore
    const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || (0, various_1.getCluster)(env));
    const walletWrapper = new anchor.Wallet(walletKeyPair);
    const provider = new anchor.Provider(solConnection, walletWrapper, {
        preflightCommitment: 'recent',
    });
    const idl = await anchor.Program.fetchIdl(constants_1.CANDY_MACHINE_PROGRAM_V2_ID, provider);
    const program = new anchor.Program(idl, constants_1.CANDY_MACHINE_PROGRAM_V2_ID, provider);
    loglevel_1.default.debug('program id from anchor', program.programId.toBase58());
    return program;
}
exports.loadCandyProgramV2 = loadCandyProgramV2;
async function loadFairLaunchProgram(walletKeyPair, env, customRpcUrl) {
    if (customRpcUrl)
        console.log('USING CUSTOM URL', customRpcUrl);
    // @ts-ignore
    const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || (0, various_1.getCluster)(env));
    const walletWrapper = new anchor.Wallet(walletKeyPair);
    const provider = new anchor.Provider(solConnection, walletWrapper, {
        preflightCommitment: 'recent',
    });
    const idl = await anchor.Program.fetchIdl(constants_1.FAIR_LAUNCH_PROGRAM_ID, provider);
    return new anchor.Program(idl, constants_1.FAIR_LAUNCH_PROGRAM_ID, provider);
}
exports.loadFairLaunchProgram = loadFairLaunchProgram;
async function loadAuctionHouseProgram(walletKeyPair, env, customRpcUrl) {
    if (customRpcUrl)
        console.log('USING CUSTOM URL', customRpcUrl);
    // @ts-ignore
    const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || (0, various_1.getCluster)(env));
    const walletWrapper = new anchor.Wallet(walletKeyPair);
    const provider = new anchor.Provider(solConnection, walletWrapper, {
        preflightCommitment: 'recent',
    });
    const idl = await anchor.Program.fetchIdl(constants_1.AUCTION_HOUSE_PROGRAM_ID, provider);
    return new anchor.Program(idl, constants_1.AUCTION_HOUSE_PROGRAM_ID, provider);
}
exports.loadAuctionHouseProgram = loadAuctionHouseProgram;
async function loadTokenEntanglementProgream(walletKeyPair, env, customRpcUrl) {
    if (customRpcUrl)
        console.log('USING CUSTOM URL', customRpcUrl);
    // @ts-ignore
    const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || (0, various_1.getCluster)(env));
    const walletWrapper = new anchor.Wallet(walletKeyPair);
    const provider = new anchor.Provider(solConnection, walletWrapper, {
        preflightCommitment: 'recent',
    });
    const idl = await anchor.Program.fetchIdl(constants_1.TOKEN_ENTANGLEMENT_PROGRAM_ID, provider);
    return new anchor.Program(idl, constants_1.TOKEN_ENTANGLEMENT_PROGRAM_ID, provider);
}
exports.loadTokenEntanglementProgream = loadTokenEntanglementProgream;
async function getTokenAmount(anchorProgram, account, mint) {
    let amount = 0;
    if (!mint.equals(constants_1.WRAPPED_SOL_MINT)) {
        try {
            const token = await anchorProgram.provider.connection.getTokenAccountBalance(account);
            amount = token.value.uiAmount * Math.pow(10, token.value.decimals);
        }
        catch (e) {
            loglevel_1.default.error(e);
            loglevel_1.default.info('Account ', account.toBase58(), 'didnt return value. Assuming 0 tokens.');
        }
    }
    else {
        amount = await anchorProgram.provider.connection.getBalance(account);
    }
    return amount;
}
exports.getTokenAmount = getTokenAmount;
const getBalance = async (account, env, customRpcUrl) => {
    if (customRpcUrl)
        console.log('USING CUSTOM URL', customRpcUrl);
    const connection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || (0, various_1.getCluster)(env));
    return await connection.getBalance(account);
};
exports.getBalance = getBalance;
async function getProgramAccounts(connection, programId, configOrCommitment) {
    const extra = {};
    let commitment;
    //let encoding;
    if (configOrCommitment) {
        if (typeof configOrCommitment === 'string') {
            commitment = configOrCommitment;
        }
        else {
            commitment = configOrCommitment.commitment;
            //encoding = configOrCommitment.encoding;
            if (configOrCommitment.dataSlice) {
                extra.dataSlice = configOrCommitment.dataSlice;
            }
            if (configOrCommitment.filters) {
                extra.filters = configOrCommitment.filters;
            }
        }
    }
    const args = connection._buildArgs([programId], commitment, 'base64', extra);
    const unsafeRes = await connection._rpcRequest('getProgramAccounts', args);
    return unsafeResAccounts(unsafeRes.result);
}
exports.getProgramAccounts = getProgramAccounts;
function unsafeAccount(account) {
    return {
        // TODO: possible delay parsing could be added here
        data: Buffer.from(account.data[0], 'base64'),
        executable: account.executable,
        lamports: account.lamports,
        // TODO: maybe we can do it in lazy way? or just use string
        owner: account.owner,
    };
}
function unsafeResAccounts(data) {
    return data.map(item => ({
        account: unsafeAccount(item.account),
        pubkey: item.pubkey,
    }));
}
