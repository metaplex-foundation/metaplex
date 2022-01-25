"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuctionHouseFromOpts = void 0;
const commander_1 = require("commander");
const loglevel_1 = __importDefault(require("loglevel"));
const accounts_1 = require("./helpers/accounts");
const anchor_1 = require("@project-serum/anchor");
const constants_1 = require("./helpers/constants");
const spl_token_1 = require("@solana/spl-token");
const various_1 = require("./helpers/various");
const transactions_1 = require("./helpers/transactions");
const schema_1 = require("./helpers/schema");
commander_1.program.version('0.0.1');
loglevel_1.default.setLevel('info');
async function getAuctionHouseFromOpts(auctionHouse, walletKeyPair, tMintKey) {
    let auctionHouseKey;
    if (auctionHouse) {
        auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    }
    else {
        loglevel_1.default.info('No auction house explicitly passed in, assuming you are creator on it and deriving key...');
        auctionHouseKey = (await (0, accounts_1.getAuctionHouse)(walletKeyPair.publicKey, tMintKey))[0];
    }
    return auctionHouseKey;
}
exports.getAuctionHouseFromOpts = getAuctionHouseFromOpts;
programCommand('show_escrow')
    .option('-ah, --auction-house <string>', 'Specific auction house')
    .option('-w, --wallet <string>', 'Specific wallet owner of escrow. If not present, we use your keypair.')
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, wallet } = cmd.opts();
    const otherWallet = wallet ? new anchor_1.web3.PublicKey(wallet) : null;
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    const auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    if (!otherWallet) {
        loglevel_1.default.info('No --wallet passed in, defaulting to keypair');
    }
    const escrow = (await (0, accounts_1.getAuctionHouseBuyerEscrow)(auctionHouseKey, otherWallet || walletKeyPair.publicKey))[0];
    const amount = await (0, accounts_1.getTokenAmount)(anchorProgram, escrow, 
    //@ts-ignore
    auctionHouseObj.treasuryMint);
    loglevel_1.default.info(otherWallet.toBase58() || walletKeyPair.publicKey.toBase58(), 'Balance:', amount);
});
programCommand('withdraw')
    .option('-ah, --auction-house <string>', 'Specific auction house')
    .option('-ak, --auction-house-keypair <string>', 'If this auction house requires sign off, pass in keypair for it')
    .option('-a, --amount <string>', 'Amount to withdraw')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, amount, auctionHouse, auctionHouseKeypair } = cmd.opts();
    const auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const auctionHouseKeypairLoaded = auctionHouseKeypair
        ? (0, accounts_1.loadWalletKey)(auctionHouseKeypair)
        : null;
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const amountAdjusted = await (0, various_1.getPriceWithMantissa)(amount, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram);
    const [escrowPaymentAccount, bump] = await (0, accounts_1.getAuctionHouseBuyerEscrow)(auctionHouseKey, walletKeyPair.publicKey);
    //@ts-ignore
    const isNative = auctionHouseObj.treasuryMint.equals(constants_1.WRAPPED_SOL_MINT);
    const ata = (await (0, accounts_1.getAtaForMint)(
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair.publicKey))[0];
    const signers = [];
    const currBal = await (0, accounts_1.getTokenAmount)(anchorProgram, escrowPaymentAccount, 
    //@ts-ignore
    auctionHouseObj.treasuryMint);
    const instruction = await anchorProgram.instruction.withdraw(bump, new anchor_1.BN(amountAdjusted), {
        accounts: {
            wallet: walletKeyPair.publicKey,
            receiptAccount: isNative ? walletKeyPair.publicKey : ata,
            escrowPaymentAccount,
            //@ts-ignore
            treasuryMint: auctionHouseObj.treasuryMint,
            //@ts-ignore
            authority: auctionHouseObj.authority,
            auctionHouse: auctionHouseKey,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
            ataProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
        },
        signers,
    });
    if (auctionHouseKeypairLoaded) {
        signers.push(auctionHouseKeypairLoaded);
        instruction.keys
            .filter(k => k.pubkey.equals(auctionHouseKeypairLoaded.publicKey))
            .map(k => (k.isSigner = true));
    }
    instruction.keys
        .filter(k => k.pubkey.equals(walletKeyPair.publicKey))
        .map(k => (k.isSigner = true));
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, [instruction], signers, 'max');
    loglevel_1.default.info('Withdrew', amountAdjusted, 'from your account with Auction House', auctionHouse, '. New Balance:', currBal - amountAdjusted);
});
programCommand('sell')
    .option('-ah, --auction-house <string>', 'Specific auction house')
    .option('-ak, --auction-house-keypair <string>', 'If this auction house requires sign off, pass in keypair for it')
    .option('-aks, --auction-house-signs', 'If you want to simulate the auction house changing the price without your sign off')
    .option('-b, --buy-price <string>', 'Price you wish to sell for')
    .option('-m, --mint <string>', 'Mint of the token to purchase')
    .option('-t, --token-size <string>', 'Amount of tokens you want to sell')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, auctionHouseKeypair, buyPrice, mint, tokenSize, auctionHouseSigns, } = cmd.opts();
    const auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const mintKey = new anchor_1.web3.PublicKey(mint);
    const auctionHouseKeypairLoaded = auctionHouseKeypair
        ? (0, accounts_1.loadWalletKey)(auctionHouseKeypair)
        : null;
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(auctionHouseSigns ? auctionHouseKeypairLoaded : walletKeyPair, env);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const buyPriceAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(buyPrice, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram));
    const tokenSizeAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(tokenSize, mintKey, walletKeyPair, anchorProgram));
    const tokenAccountKey = (await (0, accounts_1.getAtaForMint)(mintKey, walletKeyPair.publicKey))[0];
    const [programAsSigner, programAsSignerBump] = await (0, accounts_1.getAuctionHouseProgramAsSigner)();
    // const metadata = await getMetadata(mintKey);
    const [tradeState, tradeBump] = await (0, accounts_1.getAuctionHouseTradeState)(auctionHouseKey, walletKeyPair.publicKey, tokenAccountKey, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, mintKey, tokenSizeAdjusted, buyPriceAdjusted);
    const [freeTradeState, freeTradeBump] = await (0, accounts_1.getAuctionHouseTradeState)(auctionHouseKey, walletKeyPair.publicKey, tokenAccountKey, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, mintKey, tokenSizeAdjusted, new anchor_1.BN(0));
    const signers = [];
    const instruction = await anchorProgram.instruction.sell(tradeBump, freeTradeBump, programAsSignerBump, buyPriceAdjusted, tokenSizeAdjusted, {
        accounts: {
            wallet: walletKeyPair.publicKey,
            metadata: await (0, accounts_1.getMetadata)(mintKey),
            tokenAccount: tokenAccountKey,
            //@ts-ignore
            authority: auctionHouseObj.authority,
            auctionHouse: auctionHouseKey,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            sellerTradeState: tradeState,
            freeSellerTradeState: freeTradeState,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            programAsSigner,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
        },
        signers,
    });
    if (auctionHouseKeypairLoaded) {
        signers.push(auctionHouseKeypairLoaded);
        instruction.keys
            .filter(k => k.pubkey.equals(auctionHouseKeypairLoaded.publicKey))
            .map(k => (k.isSigner = true));
    }
    if (!auctionHouseSigns) {
        instruction.keys
            .filter(k => k.pubkey.equals(walletKeyPair.publicKey))
            .map(k => (k.isSigner = true));
    }
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, auctionHouseSigns ? auctionHouseKeypairLoaded : walletKeyPair, [instruction], signers, 'max');
    loglevel_1.default.info('Set', tokenSize, mint, 'for sale for', buyPrice, 'from your account with Auction House', auctionHouse);
});
programCommand('withdraw_from_treasury')
    .option('-tm, --treasury-mint <string>', 'Optional. Mint address of treasury. If not used, default to SOL. Ignored if providing -ah arg')
    .option('-ah, --auction-house <string>', 'Specific auction house(if not provided, we assume you are asking for your own)')
    .option('-a, --amount <string>', 'Amount to withdraw')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, treasuryMint, amount } = cmd.opts();
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    let tMintKey;
    if (!treasuryMint) {
        loglevel_1.default.info('No treasury mint detected, using SOL.');
        tMintKey = constants_1.WRAPPED_SOL_MINT;
    }
    else {
        tMintKey = new anchor_1.web3.PublicKey(treasuryMint);
    }
    const auctionHouseKey = await getAuctionHouseFromOpts(auctionHouse, walletKeyPair, tMintKey);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const amountAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(amount, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram));
    const signers = [];
    const instruction = await anchorProgram.instruction.withdrawFromTreasury(amountAdjusted, {
        accounts: {
            //@ts-ignore
            treasuryMint: auctionHouseObj.treasuryMint,
            //@ts-ignore
            authority: auctionHouseObj.authority,
            treasuryWithdrawalDestination: 
            //@ts-ignore
            auctionHouseObj.treasuryWithdrawalDestination,
            //@ts-ignore
            auctionHouseTreasury: auctionHouseObj.auctionHouseTreasury,
            auctionHouse: auctionHouseKey,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
        },
        signers,
    });
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, [instruction], signers, 'max');
    loglevel_1.default.info('Withdrew', amountAdjusted.toNumber(), 'from your account with Auction House', auctionHouse);
});
programCommand('withdraw_from_fees')
    .option('-tm, --treasury-mint <string>', 'Optional. Mint address of treasury. If not used, default to SOL. Ignored if providing -ah arg')
    .option('-ah, --auction-house <string>', 'Specific auction house(if not provided, we assume you are asking for your own)')
    .option('-a, --amount <string>', 'Amount to withdraw')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, treasuryMint, amount } = cmd.opts();
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    let tMintKey;
    if (!treasuryMint) {
        loglevel_1.default.info('No treasury mint detected, using SOL.');
        tMintKey = constants_1.WRAPPED_SOL_MINT;
    }
    else {
        tMintKey = new anchor_1.web3.PublicKey(treasuryMint);
    }
    const auctionHouseKey = await getAuctionHouseFromOpts(auctionHouse, walletKeyPair, tMintKey);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const amountAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(amount, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram));
    const signers = [];
    const instruction = await anchorProgram.instruction.withdrawFromFee(amountAdjusted, {
        accounts: {
            //@ts-ignore
            authority: auctionHouseObj.authority,
            feeWithdrawalDestination: 
            //@ts-ignore
            auctionHouseObj.feeWithdrawalDestination,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            auctionHouse: auctionHouseKey,
            systemProgram: anchor_1.web3.SystemProgram.programId,
        },
        signers,
    });
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, [instruction], signers, 'max');
    loglevel_1.default.info('Withdrew', amountAdjusted.toNumber(), 'from your account with Auction House', auctionHouse);
});
programCommand('cancel')
    .option('-ah, --auction-house <string>', 'Specific auction house')
    .option('-ak, --auction-house-keypair <string>', 'If this auction house requires sign off, pass in keypair for it')
    .option('-aks, --auction-house-signs', 'If you want to simulate the auction house changing the price without your sign off')
    .option('-b, --buy-price <string>', 'Price you wish to sell for')
    .option('-m, --mint <string>', 'Mint of the token to purchase')
    .option('-t, --token-size <string>', 'Amount of tokens you want to sell')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, auctionHouseKeypair, buyPrice, mint, tokenSize, auctionHouseSigns, } = cmd.opts();
    const auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const mintKey = new anchor_1.web3.PublicKey(mint);
    const auctionHouseKeypairLoaded = auctionHouseKeypair
        ? (0, accounts_1.loadWalletKey)(auctionHouseKeypair)
        : null;
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(auctionHouseSigns ? auctionHouseKeypairLoaded : walletKeyPair, env);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const buyPriceAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(buyPrice, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram));
    const tokenSizeAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(tokenSize, mintKey, walletKeyPair, anchorProgram));
    const tokenAccountKey = (await (0, accounts_1.getAtaForMint)(mintKey, walletKeyPair.publicKey))[0];
    const tradeState = (await (0, accounts_1.getAuctionHouseTradeState)(auctionHouseKey, walletKeyPair.publicKey, tokenAccountKey, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, mintKey, tokenSizeAdjusted, buyPriceAdjusted))[0];
    const signers = [];
    const instruction = await anchorProgram.instruction.cancel(buyPriceAdjusted, tokenSizeAdjusted, {
        accounts: {
            wallet: walletKeyPair.publicKey,
            tokenAccount: tokenAccountKey,
            tokenMint: mintKey,
            //@ts-ignore
            authority: auctionHouseObj.authority,
            auctionHouse: auctionHouseKey,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            tradeState,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
        },
        signers,
    });
    if (auctionHouseKeypairLoaded) {
        signers.push(auctionHouseKeypairLoaded);
        instruction.keys
            .filter(k => k.pubkey.equals(auctionHouseKeypairLoaded.publicKey))
            .map(k => (k.isSigner = true));
    }
    if (!auctionHouseSigns) {
        instruction.keys
            .filter(k => k.pubkey.equals(walletKeyPair.publicKey))
            .map(k => (k.isSigner = true));
    }
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, auctionHouseSigns ? auctionHouseKeypairLoaded : walletKeyPair, [instruction], signers, 'max');
    loglevel_1.default.info('Cancelled buy or sale of', tokenSize, mint, 'for', buyPrice, 'from your account with Auction House', auctionHouse);
});
programCommand('execute_sale')
    .option('-ah, --auction-house <string>', 'Specific auction house')
    .option('-ak, --auction-house-keypair <string>', 'If this auction house requires sign off, pass in keypair for it')
    .option('-aks, --auction-house-signs', 'If you want to simulate the auction house executing the sale without another signer')
    .option('-b, --buy-price <string>', 'Price you wish to sell for')
    .option('-m, --mint <string>', 'Mint of the token to purchase')
    .option('-t, --token-size <string>', 'Amount of tokens you want to sell')
    .option('-bw, --buyer-wallet <string>', 'Buyer wallet')
    .option('-sw, --seller-wallet <string>', 'Buyer wallet')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, auctionHouseKeypair, buyPrice, mint, tokenSize, auctionHouseSigns, buyerWallet, sellerWallet, } = cmd.opts();
    const auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const mintKey = new anchor_1.web3.PublicKey(mint);
    const auctionHouseKeypairLoaded = auctionHouseKeypair
        ? (0, accounts_1.loadWalletKey)(auctionHouseKeypair)
        : null;
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(auctionHouseSigns ? auctionHouseKeypairLoaded : walletKeyPair, env);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const buyerWalletKey = new anchor_1.web3.PublicKey(buyerWallet);
    const sellerWalletKey = new anchor_1.web3.PublicKey(sellerWallet);
    //@ts-ignore
    const isNative = auctionHouseObj.treasuryMint.equals(constants_1.WRAPPED_SOL_MINT);
    const buyPriceAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(buyPrice, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram));
    const tokenSizeAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(tokenSize, mintKey, walletKeyPair, anchorProgram));
    const tokenAccountKey = (await (0, accounts_1.getAtaForMint)(mintKey, sellerWalletKey))[0];
    const buyerTradeState = (await (0, accounts_1.getAuctionHouseTradeState)(auctionHouseKey, buyerWalletKey, tokenAccountKey, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, mintKey, tokenSizeAdjusted, buyPriceAdjusted))[0];
    const sellerTradeState = (await (0, accounts_1.getAuctionHouseTradeState)(auctionHouseKey, sellerWalletKey, tokenAccountKey, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, mintKey, tokenSizeAdjusted, buyPriceAdjusted))[0];
    const [freeTradeState, freeTradeStateBump] = await (0, accounts_1.getAuctionHouseTradeState)(auctionHouseKey, sellerWalletKey, tokenAccountKey, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, mintKey, tokenSizeAdjusted, new anchor_1.BN(0));
    const [escrowPaymentAccount, bump] = await (0, accounts_1.getAuctionHouseBuyerEscrow)(auctionHouseKey, buyerWalletKey);
    const [programAsSigner, programAsSignerBump] = await (0, accounts_1.getAuctionHouseProgramAsSigner)();
    const metadata = await (0, accounts_1.getMetadata)(mintKey);
    const metadataObj = await anchorProgram.provider.connection.getAccountInfo(metadata);
    const metadataDecoded = (0, schema_1.decodeMetadata)(Buffer.from(metadataObj.data));
    const remainingAccounts = [];
    for (let i = 0; i < metadataDecoded.data.creators.length; i++) {
        remainingAccounts.push({
            pubkey: new anchor_1.web3.PublicKey(metadataDecoded.data.creators[i].address),
            isWritable: true,
            isSigner: false,
        });
        if (!isNative) {
            remainingAccounts.push({
                pubkey: (await (0, accounts_1.getAtaForMint)(
                //@ts-ignore
                auctionHouseObj.treasuryMint, remainingAccounts[remainingAccounts.length - 1].pubkey))[0],
                isWritable: true,
                isSigner: false,
            });
        }
    }
    const signers = [];
    //@ts-ignore
    const tMint = auctionHouseObj.treasuryMint;
    const instruction = await anchorProgram.instruction.executeSale(bump, freeTradeStateBump, programAsSignerBump, buyPriceAdjusted, tokenSizeAdjusted, {
        accounts: {
            buyer: buyerWalletKey,
            seller: sellerWalletKey,
            metadata,
            tokenAccount: tokenAccountKey,
            tokenMint: mintKey,
            escrowPaymentAccount,
            treasuryMint: tMint,
            sellerPaymentReceiptAccount: isNative
                ? sellerWalletKey
                : (await (0, accounts_1.getAtaForMint)(tMint, sellerWalletKey))[0],
            buyerReceiptTokenAccount: (await (0, accounts_1.getAtaForMint)(mintKey, buyerWalletKey))[0],
            //@ts-ignore
            authority: auctionHouseObj.authority,
            auctionHouse: auctionHouseKey,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            //@ts-ignore
            auctionHouseTreasury: auctionHouseObj.auctionHouseTreasury,
            sellerTradeState,
            buyerTradeState,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            ataProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
            programAsSigner,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
            freeTradeState,
        },
        remainingAccounts,
        signers,
    });
    if (auctionHouseKeypairLoaded) {
        signers.push(auctionHouseKeypairLoaded);
        instruction.keys
            .filter(k => k.pubkey.equals(auctionHouseKeypairLoaded.publicKey))
            .map(k => (k.isSigner = true));
    }
    if (!auctionHouseSigns) {
        instruction.keys
            .filter(k => k.pubkey.equals(walletKeyPair.publicKey))
            .map(k => (k.isSigner = true));
    }
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, auctionHouseSigns ? auctionHouseKeypairLoaded : walletKeyPair, [instruction], signers, 'max');
    loglevel_1.default.info('Accepted', tokenSize, mint, 'sale from wallet', sellerWalletKey.toBase58(), 'to', buyerWalletKey.toBase58(), 'for', buyPrice, 'from your account with Auction House', auctionHouse);
});
programCommand('buy')
    .option('-ah, --auction-house <string>', 'Specific auction house')
    .option('-ak, --auction-house-keypair <string>', 'If this auction house requires sign off, pass in keypair for it')
    .option('-b, --buy-price <string>', 'Price you wish to purchase for')
    .option('-m, --mint <string>', 'Mint of the token to purchase')
    .option('-ta, --token-account <string>', 'Token account of the token to purchase - defaults to finding the one with highest balance (for NFTs)')
    .option('-t, --token-size <string>', 'Amount of tokens you want to purchase')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, auctionHouseKeypair, buyPrice, mint, tokenSize, tokenAccount, } = cmd.opts();
    const auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const mintKey = new anchor_1.web3.PublicKey(mint);
    const auctionHouseKeypairLoaded = auctionHouseKeypair
        ? (0, accounts_1.loadWalletKey)(auctionHouseKeypair)
        : null;
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const buyPriceAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(buyPrice, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram));
    const tokenSizeAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(tokenSize, mintKey, walletKeyPair, anchorProgram));
    const [escrowPaymentAccount, escrowBump] = await (0, accounts_1.getAuctionHouseBuyerEscrow)(auctionHouseKey, walletKeyPair.publicKey);
    const results = await anchorProgram.provider.connection.getTokenLargestAccounts(mintKey);
    const tokenAccountKey = tokenAccount
        ? new anchor_1.web3.PublicKey(tokenAccount)
        : results.value[0].address;
    const [tradeState, tradeBump] = await (0, accounts_1.getAuctionHouseTradeState)(auctionHouseKey, walletKeyPair.publicKey, tokenAccountKey, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, mintKey, tokenSizeAdjusted, buyPriceAdjusted);
    //@ts-ignore
    const isNative = auctionHouseObj.treasuryMint.equals(constants_1.WRAPPED_SOL_MINT);
    const ata = (await (0, accounts_1.getAtaForMint)(
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair.publicKey))[0];
    const transferAuthority = anchor_1.web3.Keypair.generate();
    const signers = isNative ? [] : [transferAuthority];
    const instruction = await anchorProgram.instruction.buy(tradeBump, escrowBump, buyPriceAdjusted, tokenSizeAdjusted, {
        accounts: {
            wallet: walletKeyPair.publicKey,
            paymentAccount: isNative ? walletKeyPair.publicKey : ata,
            transferAuthority: isNative
                ? anchor_1.web3.SystemProgram.programId
                : transferAuthority.publicKey,
            metadata: await (0, accounts_1.getMetadata)(mintKey),
            tokenAccount: tokenAccountKey,
            escrowPaymentAccount,
            //@ts-ignore
            treasuryMint: auctionHouseObj.treasuryMint,
            //@ts-ignore
            authority: auctionHouseObj.authority,
            auctionHouse: auctionHouseKey,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            buyerTradeState: tradeState,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
        },
    });
    if (auctionHouseKeypairLoaded) {
        signers.push(auctionHouseKeypairLoaded);
        instruction.keys
            .filter(k => k.pubkey.equals(auctionHouseKeypairLoaded.publicKey))
            .map(k => (k.isSigner = true));
    }
    if (!isNative) {
        instruction.keys
            .filter(k => k.pubkey.equals(transferAuthority.publicKey))
            .map(k => (k.isSigner = true));
    }
    const instructions = [
        ...(isNative
            ? []
            : [
                spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, ata, transferAuthority.publicKey, walletKeyPair.publicKey, [], buyPriceAdjusted.toNumber()),
            ]),
        instruction,
        ...(isNative
            ? []
            : [
                spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, ata, walletKeyPair.publicKey, []),
            ]),
    ];
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, instructions, signers, 'max');
    loglevel_1.default.info('Made offer for ', buyPrice);
});
programCommand('deposit')
    .option('-ah, --auction-house <string>', 'Specific auction house')
    .option('-ak, --auction-house-keypair <string>', 'If this auction house requires sign off, pass in keypair for it')
    .option('-a, --amount <string>', 'Amount to deposit')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, amount, auctionHouse, auctionHouseKeypair } = cmd.opts();
    const auctionHouseKey = new anchor_1.web3.PublicKey(auctionHouse);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const auctionHouseKeypairLoaded = auctionHouseKeypair
        ? (0, accounts_1.loadWalletKey)(auctionHouseKeypair)
        : null;
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const amountAdjusted = await (0, various_1.getPriceWithMantissa)(amount, 
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair, anchorProgram);
    const [escrowPaymentAccount, bump] = await (0, accounts_1.getAuctionHouseBuyerEscrow)(auctionHouseKey, walletKeyPair.publicKey);
    //@ts-ignore
    const isNative = auctionHouseObj.treasuryMint.equals(constants_1.WRAPPED_SOL_MINT);
    const ata = (await (0, accounts_1.getAtaForMint)(
    //@ts-ignore
    auctionHouseObj.treasuryMint, walletKeyPair.publicKey))[0];
    const transferAuthority = anchor_1.web3.Keypair.generate();
    const signers = isNative ? [] : [transferAuthority];
    const instruction = await anchorProgram.instruction.deposit(bump, new anchor_1.BN(amountAdjusted), {
        accounts: {
            wallet: walletKeyPair.publicKey,
            paymentAccount: isNative ? walletKeyPair.publicKey : ata,
            transferAuthority: isNative
                ? anchor_1.web3.SystemProgram.programId
                : transferAuthority.publicKey,
            escrowPaymentAccount,
            //@ts-ignore
            treasuryMint: auctionHouseObj.treasuryMint,
            //@ts-ignore
            authority: auctionHouseObj.authority,
            auctionHouse: auctionHouseKey,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
        },
    });
    if (auctionHouseKeypairLoaded) {
        signers.push(auctionHouseKeypairLoaded);
        instruction.keys
            .filter(k => k.pubkey.equals(auctionHouseKeypairLoaded.publicKey))
            .map(k => (k.isSigner = true));
    }
    if (!isNative) {
        instruction.keys
            .filter(k => k.pubkey.equals(transferAuthority.publicKey))
            .map(k => (k.isSigner = true));
    }
    const currBal = await (0, accounts_1.getTokenAmount)(anchorProgram, escrowPaymentAccount, 
    //@ts-ignore
    auctionHouseObj.treasuryMint);
    const instructions = [
        ...(isNative
            ? []
            : [
                spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, ata, transferAuthority.publicKey, walletKeyPair.publicKey, [], amountAdjusted),
            ]),
        instruction,
        ...(isNative
            ? []
            : [
                spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, ata, walletKeyPair.publicKey, []),
            ]),
    ];
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, instructions, signers, 'max');
    loglevel_1.default.info('Deposited ', amountAdjusted, 'to your account with Auction House', auctionHouse, '. New Balance:', currBal + amountAdjusted);
});
programCommand('show')
    .option('-tm, --treasury-mint <string>', 'Optional. Mint address of treasury. If not used, default to SOL. Ignored if providing -ah arg')
    .option('-ah, --auction-house <string>', 'Specific auction house(if not provided, we assume you are asking for your own)')
    .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, treasuryMint } = cmd.opts();
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    let tMintKey;
    if (!treasuryMint) {
        loglevel_1.default.info('No treasury mint detected, using SOL.');
        tMintKey = constants_1.WRAPPED_SOL_MINT;
    }
    else {
        tMintKey = new anchor_1.web3.PublicKey(treasuryMint);
    }
    const auctionHouseKey = await getAuctionHouseFromOpts(auctionHouse, walletKeyPair, tMintKey);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    const treasuryAmount = await (0, accounts_1.getTokenAmount)(anchorProgram, 
    //@ts-ignore
    auctionHouseObj.auctionHouseTreasury, 
    //@ts-ignore
    auctionHouseObj.treasuryMint);
    const feeAmount = await anchorProgram.provider.connection.getBalance(
    //@ts-ignore
    auctionHouseObj.auctionHouseFeeAccount);
    loglevel_1.default.info('-----');
    loglevel_1.default.info('Auction House:', auctionHouseKey.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Mint:', auctionHouseObj.treasuryMint.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Authority:', auctionHouseObj.authority.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Creator:', auctionHouseObj.creator.toBase58());
    loglevel_1.default.info('Fee Payer Acct:', 
    //@ts-ignore
    auctionHouseObj.auctionHouseFeeAccount.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Treasury Acct:', auctionHouseObj.auctionHouseTreasury.toBase58());
    loglevel_1.default.info('Fee Payer Withdrawal Acct:', 
    //@ts-ignore
    auctionHouseObj.feeWithdrawalDestination.toBase58());
    loglevel_1.default.info('Treasury Withdrawal Acct:', 
    //@ts-ignore
    auctionHouseObj.treasuryWithdrawalDestination.toBase58());
    loglevel_1.default.info('Fee Payer Bal:', feeAmount);
    loglevel_1.default.info('Treasury Bal:', treasuryAmount);
    //@ts-ignore
    loglevel_1.default.info('Seller Fee Basis Points:', auctionHouseObj.sellerFeeBasisPoints);
    //@ts-ignore
    loglevel_1.default.info('Requires Sign Off:', auctionHouseObj.requiresSignOff);
    //@ts-ignore
    loglevel_1.default.info('Can Change Sale Price:', auctionHouseObj.canChangeSalePrice);
    //@ts-ignore
    loglevel_1.default.info('AH Bump:', auctionHouseObj.bump);
    //@ts-ignore
    loglevel_1.default.info('AH Fee Bump:', auctionHouseObj.feePayerBump);
    //@ts-ignore
    loglevel_1.default.info('AH Treasury Bump:', auctionHouseObj.treasuryBump);
});
programCommand('create_auction_house')
    .option('-tm, --treasury-mint <string>', 'Mint address of treasury. If not used, default to SOL.')
    .option('-sfbp, --seller-fee-basis-points <string>', 'Auction house cut of each txn, 10000 = 100%')
    .option('-ccsp, --can-change-sale-price <string>', 'if true, and user initially places item for sale for 0, then AH can make new sell prices without consent(off chain price matching). Should only be used in concert with requires-sign-off, so AH is controlling every txn hitting the system.')
    .option('-rso, --requires-sign-off <string>', 'if true, no txn can occur against this Auction House without AH authority as signer. Good if you are doing all txns through a pass-through GCP or something.')
    .option('-twd, --treasury-withdrawal-destination <string>', 'if you wish to empty the treasury account, this is where it will land, default is your keypair. Pass in a wallet, not an ATA - ATA will be made for you if not present.')
    .option('-fwd, --fee-withdrawal-destination <string>', 'if you wish to empty the fee paying account, this is where it will land, default is your keypair')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, sellerFeeBasisPoints, canChangeSalePrice, requiresSignOff, treasuryWithdrawalDestination, feeWithdrawalDestination, treasuryMint, } = cmd.opts();
    const sfbp = parseInt(sellerFeeBasisPoints);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    let twdKey, fwdKey, tMintKey;
    if (!treasuryWithdrawalDestination) {
        loglevel_1.default.info('No treasury withdrawal dest detected, using keypair');
        twdKey = walletKeyPair.publicKey;
    }
    else {
        twdKey = new anchor_1.web3.PublicKey(treasuryWithdrawalDestination);
    }
    if (!feeWithdrawalDestination) {
        loglevel_1.default.info('No fee withdrawal dest detected, using keypair');
        fwdKey = walletKeyPair.publicKey;
    }
    else {
        fwdKey = new anchor_1.web3.PublicKey(feeWithdrawalDestination);
    }
    if (!treasuryMint) {
        loglevel_1.default.info('No treasury mint detected, using SOL.');
        tMintKey = constants_1.WRAPPED_SOL_MINT;
    }
    else {
        tMintKey = new anchor_1.web3.PublicKey(treasuryMint);
    }
    const twdAta = tMintKey.equals(constants_1.WRAPPED_SOL_MINT)
        ? twdKey
        : (await (0, accounts_1.getAtaForMint)(tMintKey, twdKey))[0];
    const [auctionHouse, bump] = await (0, accounts_1.getAuctionHouse)(walletKeyPair.publicKey, tMintKey);
    const [feeAccount, feeBump] = await (0, accounts_1.getAuctionHouseFeeAcct)(auctionHouse);
    const [treasuryAccount, treasuryBump] = await (0, accounts_1.getAuctionHouseTreasuryAcct)(auctionHouse);
    await anchorProgram.rpc.createAuctionHouse(bump, feeBump, treasuryBump, sfbp, requiresSignOff == 'true', canChangeSalePrice == 'true', {
        accounts: {
            treasuryMint: tMintKey,
            payer: walletKeyPair.publicKey,
            authority: walletKeyPair.publicKey,
            feeWithdrawalDestination: fwdKey,
            treasuryWithdrawalDestination: twdAta,
            treasuryWithdrawalDestinationOwner: twdKey,
            auctionHouse,
            auctionHouseFeeAccount: feeAccount,
            auctionHouseTreasury: treasuryAccount,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            ataProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
        },
    });
    loglevel_1.default.info('Created auction house', auctionHouse.toBase58());
});
programCommand('update_auction_house')
    .option('-tm, --treasury-mint <string>', 'Mint address of treasury used during creation. If not used, default to SOL. Ignored if providing -ah arg')
    .option('-ah, --auction-house <string>', 'Specific auction house(if not provided, we assume you are asking for your own)')
    .option('-a, --new-authority <string>', 'New authority of auction house - defaults to current authority')
    .option('-f, --force', 'Cannot set authority without this flag being set.')
    .option('-sfbp, --seller-fee-basis-points <string>', 'Auction house cut of each txn, 10000 = 100%')
    .option('-ccsp, --can-change-sale-price <string>', 'if true, and user initially places item for sale for 0, then AH can make new sell prices without consent(off chain price matching). Should only be used in concert with requires-sign-off, so AH is controlling every txn hitting the system.')
    .option('-rso, --requires-sign-off <string>', 'if true, no txn can occur against this Auction House without AH authority as signer. Good if you are doing all txns through a pass-through GCP or something.')
    .option('-twd, --treasury-withdrawal-destination <string>', 'if you wish to empty the treasury account, this is where it will land, default is your keypair. Pass in a wallet, not an ATA - ATA will be made for you if not present.')
    .option('-fwd, --fee-withdrawal-destination <string>', 'if you wish to empty the fee paying account, this is where it will land, default is your keypair')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, sellerFeeBasisPoints, canChangeSalePrice, requiresSignOff, treasuryWithdrawalDestination, feeWithdrawalDestination, treasuryMint, auctionHouse, newAuthority, force, } = cmd.opts();
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadAuctionHouseProgram)(walletKeyPair, env);
    let tMintKey;
    if (!treasuryMint) {
        loglevel_1.default.info('No treasury mint detected, using SOL.');
        tMintKey = constants_1.WRAPPED_SOL_MINT;
    }
    else {
        tMintKey = new anchor_1.web3.PublicKey(treasuryMint);
    }
    const auctionHouseKey = await getAuctionHouseFromOpts(auctionHouse, walletKeyPair, tMintKey);
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(auctionHouseKey);
    //@ts-ignore
    tMintKey = auctionHouseObj.treasuryMint;
    let twdKey, fwdKey;
    if (!treasuryWithdrawalDestination) {
        loglevel_1.default.info('No treasury withdrawal dest detected, using original value');
        twdKey = tMintKey.equals(constants_1.WRAPPED_SOL_MINT)
            ? //@ts-ignore
                auctionHouseObj.treasuryWithdrawalDestination
            : (0, accounts_1.deserializeAccount)(Buffer.from((await anchorProgram.provider.connection.getAccountInfo(
            //@ts-ignore
            auctionHouseObj.treasuryWithdrawalDestination)).data)).owner;
    }
    else {
        twdKey = new anchor_1.web3.PublicKey(treasuryWithdrawalDestination);
    }
    if (!feeWithdrawalDestination) {
        loglevel_1.default.info('No fee withdrawal dest detected, using original value');
        //@ts-ignore
        fwdKey = auctionHouseObj.feeWithdrawalDestination;
    }
    else {
        fwdKey = new anchor_1.web3.PublicKey(feeWithdrawalDestination);
    }
    const twdAta = tMintKey.equals(constants_1.WRAPPED_SOL_MINT)
        ? twdKey
        : (await (0, accounts_1.getAtaForMint)(tMintKey, twdKey))[0];
    let sfbp;
    if (sellerFeeBasisPoints != undefined && sellerFeeBasisPoints != null) {
        sfbp = parseInt(sellerFeeBasisPoints);
    }
    else {
        loglevel_1.default.info('No sfbp passed in, using original value');
        //@ts-ignore
        sfbp = auctionHouseObj.sellerFeeBasisPoints;
    }
    let newAuth;
    if (newAuthority != undefined && newAuthority != null) {
        if (!force) {
            throw Error('Cannot change authority without additional force flag. Are you sure you want to do this?');
        }
        newAuth = newAuthority;
    }
    else {
        loglevel_1.default.info('No authority passed in, using original value');
        //@ts-ignore
        newAuth = auctionHouseObj.authority;
    }
    let ccsp;
    if (canChangeSalePrice != undefined && canChangeSalePrice != null) {
        ccsp = canChangeSalePrice == 'true';
    }
    else {
        loglevel_1.default.info('No can change sale price passed in, using original value');
        //@ts-ignore
        ccsp = auctionHouseObj.canChangeSalePrice;
    }
    let rso;
    if (requiresSignOff != undefined && requiresSignOff != null) {
        rso = requiresSignOff == 'true';
    }
    else {
        loglevel_1.default.info('No requires sign off passed in, using original value');
        //@ts-ignore
        rso = auctionHouseObj.requiresSignOff;
    }
    await anchorProgram.rpc.updateAuctionHouse(sfbp, rso, ccsp, {
        accounts: {
            treasuryMint: tMintKey,
            payer: walletKeyPair.publicKey,
            authority: walletKeyPair.publicKey,
            // extra safety here even though newAuth should be right
            //@ts-ignore
            newAuthority: force ? newAuth : auctionHouseObj.authority,
            feeWithdrawalDestination: fwdKey,
            treasuryWithdrawalDestination: twdAta,
            treasuryWithdrawalDestinationOwner: twdKey,
            auctionHouse: auctionHouseKey,
            //@ts-ignore
            auctionHouseFeeAccount: auctionHouseObj.feePayer,
            //@ts-ignore
            auctionHouseTreasury: auctionHouseObj.treasury,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            ataProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
        },
    });
    loglevel_1.default.info('Updated auction house', auctionHouseKey.toBase58());
});
function programCommand(name) {
    return commander_1.program
        .command(name)
        .option('-e, --env <string>', 'Solana cluster env name', 'devnet')
        .option('-k, --keypair <path>', `Solana wallet location`, '--keypair not provided')
        .option('-l, --log-level <string>', 'log level', setLogLevel);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
    if (value === undefined || value === null) {
        return;
    }
    loglevel_1.default.info('setting the log value to: ' + value);
    loglevel_1.default.setLevel(value);
}
commander_1.program.parse(process.argv);
