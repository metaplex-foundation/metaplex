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
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintV2 = exports.mint = void 0;
const web3_js_1 = require("@solana/web3.js");
const accounts_1 = require("../helpers/accounts");
const constants_1 = require("../helpers/constants");
const anchor = __importStar(require("@project-serum/anchor"));
const spl_token_1 = require("@solana/spl-token");
const instructions_1 = require("../helpers/instructions");
const transactions_1 = require("../helpers/transactions");
async function mint(keypair, env, configAddress, uuid, rpcUrl) {
    const mint = web3_js_1.Keypair.generate();
    const userKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgram)(userKeyPair, env, rpcUrl);
    const userTokenAccountAddress = await (0, accounts_1.getTokenWallet)(userKeyPair.publicKey, mint.publicKey);
    const [candyMachineAddress] = await (0, accounts_1.getCandyMachineAddress)(configAddress, uuid);
    const candyMachine = await anchorProgram.account.candyMachine.fetch(candyMachineAddress);
    const remainingAccounts = [];
    const signers = [mint, userKeyPair];
    const instructions = [
        anchor.web3.SystemProgram.createAccount({
            fromPubkey: userKeyPair.publicKey,
            newAccountPubkey: mint.publicKey,
            space: spl_token_1.MintLayout.span,
            lamports: await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(spl_token_1.MintLayout.span),
            programId: constants_1.TOKEN_PROGRAM_ID,
        }),
        spl_token_1.Token.createInitMintInstruction(constants_1.TOKEN_PROGRAM_ID, mint.publicKey, 0, userKeyPair.publicKey, userKeyPair.publicKey),
        (0, instructions_1.createAssociatedTokenAccountInstruction)(userTokenAccountAddress, userKeyPair.publicKey, userKeyPair.publicKey, mint.publicKey),
        spl_token_1.Token.createMintToInstruction(constants_1.TOKEN_PROGRAM_ID, mint.publicKey, userTokenAccountAddress, userKeyPair.publicKey, [], 1),
    ];
    let tokenAccount;
    if (candyMachine.tokenMint) {
        const transferAuthority = anchor.web3.Keypair.generate();
        tokenAccount = await (0, accounts_1.getTokenWallet)(userKeyPair.publicKey, candyMachine.tokenMint);
        remainingAccounts.push({
            pubkey: tokenAccount,
            isWritable: true,
            isSigner: false,
        });
        remainingAccounts.push({
            pubkey: userKeyPair.publicKey,
            isWritable: false,
            isSigner: true,
        });
        instructions.push(spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, tokenAccount, transferAuthority.publicKey, userKeyPair.publicKey, [], candyMachine.data.price.toNumber()));
    }
    const metadataAddress = await (0, accounts_1.getMetadata)(mint.publicKey);
    const masterEdition = await (0, accounts_1.getMasterEdition)(mint.publicKey);
    instructions.push(await anchorProgram.instruction.mintNft({
        accounts: {
            config: configAddress,
            candyMachine: candyMachineAddress,
            payer: userKeyPair.publicKey,
            //@ts-ignore
            wallet: candyMachine.wallet,
            mint: mint.publicKey,
            metadata: metadataAddress,
            masterEdition,
            mintAuthority: userKeyPair.publicKey,
            updateAuthority: userKeyPair.publicKey,
            tokenMetadataProgram: constants_1.TOKEN_METADATA_PROGRAM_ID,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        remainingAccounts,
    }));
    if (tokenAccount) {
        instructions.push(spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, tokenAccount, userKeyPair.publicKey, []));
    }
    return (await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, userKeyPair, instructions, signers)).txid;
}
exports.mint = mint;
async function mintV2(keypair, env, candyMachineAddress, rpcUrl) {
    const mint = web3_js_1.Keypair.generate();
    const userKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadCandyProgramV2)(userKeyPair, env, rpcUrl);
    const userTokenAccountAddress = await (0, accounts_1.getTokenWallet)(userKeyPair.publicKey, mint.publicKey);
    const candyMachine = await anchorProgram.account.candyMachine.fetch(candyMachineAddress);
    const remainingAccounts = [];
    const signers = [mint, userKeyPair];
    const cleanupInstructions = [];
    const instructions = [
        anchor.web3.SystemProgram.createAccount({
            fromPubkey: userKeyPair.publicKey,
            newAccountPubkey: mint.publicKey,
            space: spl_token_1.MintLayout.span,
            lamports: await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(spl_token_1.MintLayout.span),
            programId: constants_1.TOKEN_PROGRAM_ID,
        }),
        spl_token_1.Token.createInitMintInstruction(constants_1.TOKEN_PROGRAM_ID, mint.publicKey, 0, userKeyPair.publicKey, userKeyPair.publicKey),
        (0, instructions_1.createAssociatedTokenAccountInstruction)(userTokenAccountAddress, userKeyPair.publicKey, userKeyPair.publicKey, mint.publicKey),
        spl_token_1.Token.createMintToInstruction(constants_1.TOKEN_PROGRAM_ID, mint.publicKey, userTokenAccountAddress, userKeyPair.publicKey, [], 1),
    ];
    if (candyMachine.data.whitelistMintSettings) {
        const mint = new anchor.web3.PublicKey(candyMachine.data.whitelistMintSettings.mint);
        const whitelistToken = (await (0, accounts_1.getAtaForMint)(mint, userKeyPair.publicKey))[0];
        remainingAccounts.push({
            pubkey: whitelistToken,
            isWritable: true,
            isSigner: false,
        });
        if (candyMachine.data.whitelistMintSettings.mode.burnEveryTime) {
            const whitelistBurnAuthority = anchor.web3.Keypair.generate();
            remainingAccounts.push({
                pubkey: mint,
                isWritable: true,
                isSigner: false,
            });
            remainingAccounts.push({
                pubkey: whitelistBurnAuthority.publicKey,
                isWritable: false,
                isSigner: true,
            });
            signers.push(whitelistBurnAuthority);
            const exists = await anchorProgram.provider.connection.getAccountInfo(whitelistToken);
            if (exists) {
                instructions.push(spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, whitelistToken, whitelistBurnAuthority.publicKey, userKeyPair.publicKey, [], 1));
                cleanupInstructions.push(spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, whitelistToken, userKeyPair.publicKey, []));
            }
        }
    }
    let tokenAccount;
    if (candyMachine.tokenMint) {
        const transferAuthority = anchor.web3.Keypair.generate();
        tokenAccount = await (0, accounts_1.getTokenWallet)(userKeyPair.publicKey, candyMachine.tokenMint);
        remainingAccounts.push({
            pubkey: tokenAccount,
            isWritable: true,
            isSigner: false,
        });
        remainingAccounts.push({
            pubkey: transferAuthority.publicKey,
            isWritable: false,
            isSigner: true,
        });
        instructions.push(spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, tokenAccount, transferAuthority.publicKey, userKeyPair.publicKey, [], candyMachine.data.price.toNumber()));
        signers.push(transferAuthority);
        cleanupInstructions.push(spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, tokenAccount, userKeyPair.publicKey, []));
    }
    const metadataAddress = await (0, accounts_1.getMetadata)(mint.publicKey);
    const masterEdition = await (0, accounts_1.getMasterEdition)(mint.publicKey);
    const [candyMachineCreator, creatorBump] = await (0, accounts_1.getCandyMachineCreator)(candyMachineAddress);
    instructions.push(await anchorProgram.instruction.mintNft(creatorBump, {
        accounts: {
            candyMachine: candyMachineAddress,
            candyMachineCreator,
            payer: userKeyPair.publicKey,
            //@ts-ignore
            wallet: candyMachine.wallet,
            mint: mint.publicKey,
            metadata: metadataAddress,
            masterEdition,
            mintAuthority: userKeyPair.publicKey,
            updateAuthority: userKeyPair.publicKey,
            tokenMetadataProgram: constants_1.TOKEN_METADATA_PROGRAM_ID,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: web3_js_1.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
            instructionSysvarAccount: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        remainingAccounts: remainingAccounts.length > 0 ? remainingAccounts : undefined,
    }));
    const finished = (await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, userKeyPair, instructions, signers)).txid;
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, userKeyPair, cleanupInstructions, []);
    return finished;
}
exports.mintV2 = mintV2;
