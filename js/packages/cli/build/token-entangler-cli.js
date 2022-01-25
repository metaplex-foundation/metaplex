"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEpKeyFromArgs = void 0;
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
const getEpKeyFromArgs = async (anchorProgram, mintA, mintB, entangledPair) => {
    let epKey;
    if (!entangledPair) {
        loglevel_1.default.info('No entangled pair detected, generating from mint arguments.');
        epKey = (await (0, accounts_1.getTokenEntanglement)(mintA, mintB))[0];
        const obj = await anchorProgram.provider.connection.getAccountInfo(epKey);
        if (!obj) {
            epKey = (await (0, accounts_1.getTokenEntanglement)(mintB, mintA))[0];
        }
    }
    else {
        epKey = new anchor_1.web3.PublicKey(entangledPair);
    }
    return epKey;
};
exports.getEpKeyFromArgs = getEpKeyFromArgs;
programCommand('show')
    .option('-ep, --entangled-pair <string>', 'Optional. Overrides mint arguments.')
    .option('-ma, --mint-a <string>', 'mint a')
    .option('-mb, --mint-b <string>', 'mint b')
    .action(async (directory, cmd) => {
    const { keypair, env, entangledPair, mintA, mintB } = cmd.opts();
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadTokenEntanglementProgream)(walletKeyPair, env);
    const epKey = await (0, exports.getEpKeyFromArgs)(anchorProgram, mintA ? new anchor_1.web3.PublicKey(mintA) : null, mintB ? new anchor_1.web3.PublicKey(mintB) : null, entangledPair);
    const epObj = await anchorProgram.account.entangledPair.fetch(epKey);
    loglevel_1.default.info('-----');
    loglevel_1.default.info('Entangled Pair:', epKey.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Mint:', epObj.treasuryMint.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Authority:', epObj.authority.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Mint A:', epObj.mintA.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Mint B:', epObj.mintB.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Token A Escrow:', epObj.tokenAEscrow.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Token B Escrow:', epObj.tokenBEscrow.toBase58());
    //@ts-ignore
    loglevel_1.default.info('Price:', epObj.price.toNumber());
    //@ts-ignore
    loglevel_1.default.info('Paid At Least Once:', epObj.paid);
    //@ts-ignore
    loglevel_1.default.info('Pays Every Time:', epObj.paysEveryTime);
    //@ts-ignore
    loglevel_1.default.info('Bump:', epObj.bump);
});
programCommand('create_entanglement')
    .option('-tm, --treasury-mint <string>', 'Mint address of treasury. If not used, default to SOL.')
    .option('-a, --authority <string>', 'Authority, defaults to keypair')
    .option('-p, --price <string>', 'Price for a swap')
    .option('-pet, --pays-every-time <string>', 'If true, the user must pay the swapping fee each swap')
    .option('-ma, --mint-a <string>', 'Mint a. You do not even need to own this token to create this entanglement.')
    .option('-mb, --mint-b <string>', 'Mint b. This token will be removed from your token account right now.')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, price, paysEveryTime, mintA, mintB, treasuryMint, authority, } = cmd.opts();
    const priceNumber = parseFloat(price);
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadTokenEntanglementProgream)(walletKeyPair, env);
    let authorityKey, tMintKey;
    if (!authority) {
        loglevel_1.default.info('No authority detected, using keypair');
        authorityKey = walletKeyPair.publicKey;
    }
    else {
        authorityKey = new anchor_1.web3.PublicKey(authority);
    }
    const mintAKey = new anchor_1.web3.PublicKey(mintA);
    const mintBKey = new anchor_1.web3.PublicKey(mintB);
    if (!treasuryMint) {
        loglevel_1.default.info('No treasury mint detected, using SOL.');
        tMintKey = constants_1.WRAPPED_SOL_MINT;
    }
    else {
        tMintKey = new anchor_1.web3.PublicKey(treasuryMint);
    }
    const [entangledPair, bump] = await (0, accounts_1.getTokenEntanglement)(mintAKey, mintBKey);
    const [reverseEntangledPair, reverseBump] = await (0, accounts_1.getTokenEntanglement)(mintBKey, mintAKey);
    const [tokenAEscrow, tokenABump, tokenBEscrow, tokenBBump] = await (0, accounts_1.getTokenEntanglementEscrows)(mintAKey, mintBKey);
    const priceAdjusted = new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(priceNumber, tMintKey, walletKeyPair, anchorProgram));
    const ata = (await (0, accounts_1.getAtaForMint)(mintBKey, walletKeyPair.publicKey))[0];
    const transferAuthority = anchor_1.web3.Keypair.generate();
    const signers = [transferAuthority];
    const instruction = await anchorProgram.instruction.createEntangledPair(bump, reverseBump, tokenABump, tokenBBump, priceAdjusted, paysEveryTime == 'true', {
        accounts: {
            treasuryMint: tMintKey,
            payer: walletKeyPair.publicKey,
            transferAuthority: transferAuthority.publicKey,
            authority: authorityKey,
            mintA: mintAKey,
            metadataA: await (0, accounts_1.getMetadata)(mintAKey),
            editionA: await (0, accounts_1.getMasterEdition)(mintAKey),
            mintB: mintBKey,
            metadataB: await (0, accounts_1.getMetadata)(mintBKey),
            editionB: await (0, accounts_1.getMasterEdition)(mintBKey),
            tokenB: ata,
            tokenAEscrow,
            tokenBEscrow,
            entangledPair,
            reverseEntangledPair,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
        },
    });
    const instructions = [
        spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, ata, transferAuthority.publicKey, walletKeyPair.publicKey, [], 1),
        instruction,
        spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, ata, walletKeyPair.publicKey, []),
    ];
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, instructions, signers, 'max');
    loglevel_1.default.info('Created entanglement', entangledPair.toBase58());
});
programCommand('swap')
    .option('-ep, --entangled-pair <string>', 'Optional. Overrides mint arguments.')
    .option('-ma, --mint-a <string>', 'Mint a. You do not even need to own this token to create this entanglement.')
    .option('-mb, --mint-b <string>', 'Mint b. This token will be removed from your token account right now.')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, mintA, mintB, entangledPair } = cmd.opts();
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadTokenEntanglementProgream)(walletKeyPair, env);
    const epKey = await (0, exports.getEpKeyFromArgs)(anchorProgram, mintA ? new anchor_1.web3.PublicKey(mintA) : null, mintB ? new anchor_1.web3.PublicKey(mintB) : null, entangledPair);
    const epObj = await anchorProgram.account.entangledPair.fetch(epKey);
    //@ts-ignore
    const mintAKey = epObj.mintA;
    //@ts-ignore
    const mintBKey = epObj.mintB;
    const aAta = (await (0, accounts_1.getAtaForMint)(mintAKey, walletKeyPair.publicKey))[0];
    const bAta = (await (0, accounts_1.getAtaForMint)(mintBKey, walletKeyPair.publicKey))[0];
    const currABal = await (0, accounts_1.getTokenAmount)(anchorProgram, aAta, mintAKey);
    const token = currABal == 1 ? aAta : bAta, replacementToken = currABal == 1 ? bAta : aAta;
    const tokenMint = currABal == 1 ? mintAKey : mintBKey, replacementTokenMint = currABal == 1 ? mintBKey : mintAKey;
    const result = await (0, accounts_1.getTokenEntanglementEscrows)(mintAKey, mintBKey);
    const tokenAEscrow = result[0];
    const tokenBEscrow = result[2];
    const transferAuthority = anchor_1.web3.Keypair.generate();
    const paymentTransferAuthority = anchor_1.web3.Keypair.generate();
    const replacementTokenMetadata = await (0, accounts_1.getMetadata)(replacementTokenMint);
    const signers = [transferAuthority];
    //@ts-ignore
    const isNative = epObj.treasuryMint.equals(constants_1.WRAPPED_SOL_MINT);
    //@ts-ignore
    const paymentAccount = isNative
        ? walletKeyPair.publicKey
        : (await (0, accounts_1.getAtaForMint)(epObj.treasuryMint, walletKeyPair.publicKey))[0];
    if (!isNative)
        signers.push(paymentTransferAuthority);
    const remainingAccounts = [];
    const metadataObj = await anchorProgram.provider.connection.getAccountInfo(replacementTokenMetadata);
    const metadataDecoded = (0, schema_1.decodeMetadata)(Buffer.from(metadataObj.data));
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
                epObj.treasuryMint, remainingAccounts[remainingAccounts.length - 1].pubkey))[0],
                isWritable: true,
                isSigner: false,
            });
        }
    }
    const instruction = await anchorProgram.instruction.swap({
        accounts: {
            //@ts-ignore
            treasuryMint: epObj.treasuryMint,
            payer: walletKeyPair.publicKey,
            paymentAccount,
            transferAuthority: transferAuthority.publicKey,
            paymentTransferAuthority: paymentTransferAuthority.publicKey,
            token,
            replacementTokenMetadata,
            replacementToken,
            replacementTokenMint,
            tokenAEscrow,
            tokenBEscrow,
            entangledPair: epKey,
            tokenProgram: constants_1.TOKEN_PROGRAM_ID,
            systemProgram: anchor_1.web3.SystemProgram.programId,
            ataProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
        },
        remainingAccounts,
    });
    if (!isNative) {
        instruction.keys
            .filter(k => k.pubkey.equals(paymentTransferAuthority.publicKey))
            .map(k => (k.isSigner = true));
    }
    const instructions = [
        spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, token, transferAuthority.publicKey, walletKeyPair.publicKey, [], 1),
        ...(!isNative
            ? [
                spl_token_1.Token.createApproveInstruction(constants_1.TOKEN_PROGRAM_ID, paymentAccount, paymentTransferAuthority.publicKey, walletKeyPair.publicKey, [], 
                //@ts-ignore
                epObj.price.toNumber()),
            ]
            : []),
        instruction,
        spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, token, walletKeyPair.publicKey, []),
        ...(!isNative
            ? [
                spl_token_1.Token.createRevokeInstruction(constants_1.TOKEN_PROGRAM_ID, paymentAccount, walletKeyPair.publicKey, []),
            ]
            : []),
    ];
    await (0, transactions_1.sendTransactionWithRetryWithKeypair)(anchorProgram.provider.connection, walletKeyPair, instructions, signers, 'max');
    loglevel_1.default.info('Swapped', tokenMint.toBase58(), 'mint for', replacementTokenMint.toBase58(), ' with entangled pair ', epKey.toBase58());
});
programCommand('update_entanglement')
    .option('-ep, --entangled-pair <string>', 'Optional. Overrides mint arguments.')
    .option('-na, --new-authority <string>', 'Authority, defaults to keypair')
    .option('-p, --price <string>', 'Price for a swap')
    .option('-pet, --pays-every-time <string>', 'If true, the user must pay the swapping fee each swap')
    .option('-ma, --mint-a <string>', 'Mint a. You do not even need to own this token to create this entanglement.')
    .option('-mb, --mint-b <string>', 'Mint b. This token will be removed from your token account right now.')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (directory, cmd) => {
    const { keypair, env, price, paysEveryTime, mintA, mintB, entangledPair, newAuthority, } = cmd.opts();
    const walletKeyPair = (0, accounts_1.loadWalletKey)(keypair);
    const anchorProgram = await (0, accounts_1.loadTokenEntanglementProgream)(walletKeyPair, env);
    const epKey = await (0, exports.getEpKeyFromArgs)(anchorProgram, mintA ? new anchor_1.web3.PublicKey(mintA) : null, mintB ? new anchor_1.web3.PublicKey(mintB) : null, entangledPair);
    const epObj = await anchorProgram.account.entangledPair.fetch(epKey);
    //@ts-ignore
    const authorityKey = new anchor_1.web3.PublicKey(newAuthority ? newAuthority : epObj.authority);
    const priceAdjusted = price
        ? new anchor_1.BN(await (0, various_1.getPriceWithMantissa)(parseFloat(price), 
        //@ts-ignore
        epObj.treasuryMint, walletKeyPair, anchorProgram))
        : //@ts-ignore
            epObj.price;
    await anchorProgram.rpc.updateEntangledPair(priceAdjusted, paysEveryTime == 'true', {
        accounts: {
            newAuthority: authorityKey,
            //@ts-ignore
            authority: epObj.authority,
            entangledPair: epKey,
        },
    });
    loglevel_1.default.info('Updated entanglement', epKey.toBase58());
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
