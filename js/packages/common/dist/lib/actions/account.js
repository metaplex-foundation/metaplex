"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOrCreateAccountByMint = exports.ensureWrappedAccount = exports.createTokenAccount = exports.createMint = exports.createAssociatedTokenAccountInstruction = exports.createUninitializedAccount = exports.createUninitializedMint = exports.createTempMemoryAccount = exports.DEFAULT_TEMP_MEM_SPACE = exports.ensureSplAccount = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const ids_1 = require("../utils/ids");
const programIds_1 = require("../utils/programIds");
const cache_1 = require("../contexts/accounts/cache");
const parsesrs_1 = require("../contexts/accounts/parsesrs");
function ensureSplAccount(instructions, cleanupInstructions, toCheck, payer, amount, signers) {
    if (!toCheck.info.isNative) {
        return toCheck.pubkey;
    }
    const account = createUninitializedAccount(instructions, payer, amount, signers);
    instructions.push(spl_token_1.Token.createInitAccountInstruction(ids_1.TOKEN_PROGRAM_ID, ids_1.WRAPPED_SOL_MINT, account, payer));
    cleanupInstructions.push(spl_token_1.Token.createCloseAccountInstruction(ids_1.TOKEN_PROGRAM_ID, account, payer, payer, []));
    return account;
}
exports.ensureSplAccount = ensureSplAccount;
exports.DEFAULT_TEMP_MEM_SPACE = 65548;
function createTempMemoryAccount(instructions, payer, signers, owner, space = exports.DEFAULT_TEMP_MEM_SPACE) {
    const account = web3_js_1.Keypair.generate();
    instructions.push(web3_js_1.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: account.publicKey,
        // 0 will evict/close account since it cannot pay rent
        lamports: 0,
        space: space,
        programId: owner,
    }));
    signers.push(account);
    return account.publicKey;
}
exports.createTempMemoryAccount = createTempMemoryAccount;
function createUninitializedMint(instructions, payer, amount, signers) {
    const account = web3_js_1.Keypair.generate();
    instructions.push(web3_js_1.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: account.publicKey,
        lamports: amount,
        space: spl_token_1.MintLayout.span,
        programId: ids_1.TOKEN_PROGRAM_ID,
    }));
    signers.push(account);
    return account.publicKey;
}
exports.createUninitializedMint = createUninitializedMint;
function createUninitializedAccount(instructions, payer, amount, signers) {
    const account = web3_js_1.Keypair.generate();
    instructions.push(web3_js_1.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: account.publicKey,
        lamports: amount,
        space: spl_token_1.AccountLayout.span,
        programId: ids_1.TOKEN_PROGRAM_ID,
    }));
    signers.push(account);
    return account.publicKey;
}
exports.createUninitializedAccount = createUninitializedAccount;
function createAssociatedTokenAccountInstruction(instructions, associatedTokenAddress, payer, walletAddress, splTokenMintAddress) {
    const keys = [
        {
            pubkey: payer,
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: associatedTokenAddress,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: walletAddress,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: splTokenMintAddress,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: web3_js_1.SystemProgram.programId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: ids_1.TOKEN_PROGRAM_ID,
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
        programId: ids_1.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        data: Buffer.from([]),
    }));
}
exports.createAssociatedTokenAccountInstruction = createAssociatedTokenAccountInstruction;
function createMint(instructions, payer, mintRentExempt, decimals, owner, freezeAuthority, signers) {
    const account = createUninitializedMint(instructions, payer, mintRentExempt, signers);
    instructions.push(spl_token_1.Token.createInitMintInstruction(ids_1.TOKEN_PROGRAM_ID, account, decimals, owner, freezeAuthority));
    return account;
}
exports.createMint = createMint;
function createTokenAccount(instructions, payer, accountRentExempt, mint, owner, signers) {
    const account = createUninitializedAccount(instructions, payer, accountRentExempt, signers);
    instructions.push(spl_token_1.Token.createInitAccountInstruction(ids_1.TOKEN_PROGRAM_ID, mint, account, owner));
    return account;
}
exports.createTokenAccount = createTokenAccount;
function ensureWrappedAccount(instructions, cleanupInstructions, toCheck, payer, amount, signers) {
    if (toCheck && !toCheck.info.isNative) {
        return toCheck.pubkey;
    }
    const TOKEN_PROGRAM_ID = (0, programIds_1.programIds)().token;
    const account = web3_js_1.Keypair.generate();
    instructions.push(web3_js_1.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: account.publicKey,
        lamports: amount,
        space: spl_token_1.AccountLayout.span,
        programId: TOKEN_PROGRAM_ID,
    }));
    instructions.push(spl_token_1.Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, ids_1.WRAPPED_SOL_MINT, account.publicKey, payer));
    cleanupInstructions.push(spl_token_1.Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, account.publicKey, payer, payer, []));
    signers.push(account);
    return account.publicKey.toBase58();
}
exports.ensureWrappedAccount = ensureWrappedAccount;
// TODO: check if one of to accounts needs to be native sol ... if yes unwrap it ...
function findOrCreateAccountByMint(payer, owner, instructions, cleanupInstructions, accountRentExempt, mint, // use to identify same type
signers, excluded) {
    const accountToFind = mint.toBase58();
    const ownerKey = owner.toBase58();
    const account = cache_1.cache
        .byParser(parsesrs_1.TokenAccountParser)
        .map(id => cache_1.cache.get(id))
        .find(acc => acc !== undefined &&
        acc.info.mint.toBase58() === accountToFind &&
        acc.info.owner.toBase58() === ownerKey &&
        (excluded === undefined || !excluded.has(acc.pubkey)));
    const isWrappedSol = accountToFind === ids_1.WRAPPED_SOL_MINT.toBase58();
    let toAccount;
    if (account && !isWrappedSol) {
        toAccount = new web3_js_1.PublicKey(account.pubkey);
    }
    else {
        // creating depositor pool account
        toAccount = createTokenAccount(instructions, payer, accountRentExempt, mint, owner, signers);
        if (isWrappedSol) {
            cleanupInstructions.push(spl_token_1.Token.createCloseAccountInstruction(ids_1.TOKEN_PROGRAM_ID, toAccount, payer, payer, []));
        }
    }
    return toAccount;
}
exports.findOrCreateAccountByMint = findOrCreateAccountByMint;
//# sourceMappingURL=account.js.map