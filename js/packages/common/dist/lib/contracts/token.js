"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintNFT = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const wallet_adapter_base_1 = require("@solana/wallet-adapter-base");
const mintNFT = async (connection, wallet, 
// SOL account
owner) => {
    if (!wallet.publicKey)
        throw new wallet_adapter_base_1.WalletNotConnectedError();
    const TOKEN_PROGRAM_ID = new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    //const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    //  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    //);
    const mintAccount = new web3_js_1.Account();
    const tokenAccount = new web3_js_1.Account();
    // Allocate memory for the account
    const mintRent = await connection.getMinimumBalanceForRentExemption(spl_token_1.MintLayout.span);
    const accountRent = await connection.getMinimumBalanceForRentExemption(spl_token_1.AccountLayout.span);
    let transaction = new web3_js_1.Transaction();
    const signers = [mintAccount, tokenAccount];
    transaction.recentBlockhash = (await connection.getRecentBlockhash('max')).blockhash;
    transaction.add(web3_js_1.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintAccount.publicKey,
        lamports: mintRent,
        space: spl_token_1.MintLayout.span,
        programId: TOKEN_PROGRAM_ID,
    }));
    transaction.add(web3_js_1.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: tokenAccount.publicKey,
        lamports: accountRent,
        space: spl_token_1.AccountLayout.span,
        programId: TOKEN_PROGRAM_ID,
    }));
    transaction.add(spl_token_1.Token.createInitMintInstruction(TOKEN_PROGRAM_ID, mintAccount.publicKey, 0, wallet.publicKey, wallet.publicKey));
    transaction.add(spl_token_1.Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, mintAccount.publicKey, tokenAccount.publicKey, owner));
    transaction.add(spl_token_1.Token.createMintToInstruction(TOKEN_PROGRAM_ID, mintAccount.publicKey, tokenAccount.publicKey, wallet.publicKey, [], 1));
    transaction.add(spl_token_1.Token.createSetAuthorityInstruction(TOKEN_PROGRAM_ID, mintAccount.publicKey, null, 'MintTokens', wallet.publicKey, []));
    transaction.setSigners(wallet.publicKey, ...signers.map(s => s.publicKey));
    if (signers.length > 0) {
        transaction.partialSign(...signers);
    }
    transaction = await wallet.signTransaction(transaction);
    const rawTransaction = transaction.serialize();
    const options = {
        skipPreflight: true,
        commitment: 'singleGossip',
    };
    const txid = await connection.sendRawTransaction(rawTransaction, options);
    return { txid, mint: mintAccount.publicKey, account: tokenAccount.publicKey };
};
exports.mintNFT = mintNFT;
//# sourceMappingURL=token.js.map