"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemPrintingV2Bid = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const actions_1 = require("../../actions");
const utils_1 = require("../../utils");
async function redeemPrintingV2Bid(vault, safetyDepositTokenStore, tokenAccount, safetyDeposit, bidder, payer, metadata, masterEdition, originalMint, newMint, edition, editionOffset, winIndex, instructions) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const { auctionKey, auctionManagerKey } = await (0, _1.getAuctionKeys)(vault);
    const { bidRedemption, bidMetadata } = await (0, _1.getBidderKeys)(auctionKey, bidder);
    const prizeTrackingTicket = await (0, _1.getPrizeTrackingTicket)(auctionManagerKey, originalMint);
    const safetyDepositConfig = await (0, _1.getSafetyDepositConfig)(auctionManagerKey, safetyDeposit);
    const newMetadata = await (0, actions_1.getMetadata)(newMint);
    const newEdition = await (0, actions_1.getEdition)(newMint);
    const editionMarkPda = await (0, actions_1.getEditionMarkPda)(originalMint, edition);
    const value = new _1.RedeemPrintingV2BidArgs({ editionOffset, winIndex });
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
    const extended = await (0, actions_1.getAuctionExtended)({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault,
    });
    const keys = [
        {
            pubkey: (0, utils_1.toPublicKey)(auctionManagerKey),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDepositTokenStore),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidRedemption),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDeposit),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(vault),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDepositConfig),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(auctionKey),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidMetadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(bidder),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: PROGRAM_IDS.token,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(PROGRAM_IDS.vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(PROGRAM_IDS.metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: store,
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
        {
            pubkey: (0, utils_1.toPublicKey)(prizeTrackingTicket),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(newMetadata),
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
            // Mint authority (this) is going to be the payer since the bidder
            // may not be signer hre - we may be redeeming for someone else (permissionless)
            // and during the txn, mint authority is removed from us and given to master edition.
            // The ATA account is already owned by bidder by default. No signing needed
            pubkey: (0, utils_1.toPublicKey)(payer),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(metadata),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(extended),
            isSigner: false,
            isWritable: false,
        },
    ];
    instructions.push(new web3_js_1.TransactionInstruction({
        keys,
        programId: (0, utils_1.toPublicKey)(PROGRAM_IDS.metaplex),
        data,
    }));
}
exports.redeemPrintingV2Bid = redeemPrintingV2Bid;
//# sourceMappingURL=redeemPrintingV2Bid.js.map