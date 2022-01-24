"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemParticipationBidV3 = void 0;
const web3_js_1 = require("@solana/web3.js");
const borsh_1 = require("borsh");
const _1 = require(".");
const actions_1 = require("../../actions");
const utils_1 = require("../../utils");
async function redeemParticipationBidV3(vault, safetyDepositTokenStore, destination, safetyDeposit, bidder, payer, metadata, masterEdition, originalMint, transferAuthority, acceptPaymentAccount, tokenPaymentAccount, newMint, edition, winIndex, instructions) {
    const PROGRAM_IDS = (0, utils_1.programIds)();
    const store = PROGRAM_IDS.store;
    if (!store) {
        throw new Error('Store not initialized');
    }
    const { auctionKey, auctionManagerKey } = await (0, _1.getAuctionKeys)(vault);
    const auctionDataExtended = await (0, actions_1.getAuctionExtended)({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault,
    });
    const { bidRedemption, bidMetadata } = await (0, _1.getBidderKeys)(auctionKey, bidder);
    const prizeTrackingTicket = await (0, _1.getPrizeTrackingTicket)(auctionManagerKey, originalMint);
    const newMetadata = await (0, actions_1.getMetadata)(newMint);
    const newEdition = await (0, actions_1.getEdition)(newMint);
    const editionMarkPda = await (0, actions_1.getEditionMarkPda)(originalMint, edition);
    const safetyDepositConfig = await (0, _1.getSafetyDepositConfig)(auctionManagerKey, safetyDeposit);
    const value = new _1.RedeemParticipationBidV3Args({ winIndex });
    const data = Buffer.from((0, borsh_1.serialize)(_1.SCHEMA, value));
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
            pubkey: (0, utils_1.toPublicKey)(destination),
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
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(vault),
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(safetyDepositConfig),
            isSigner: false,
            isWritable: true,
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
            isWritable: true,
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
            pubkey: (0, utils_1.toPublicKey)(transferAuthority),
            isSigner: true,
            isWritable: false,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(acceptPaymentAccount),
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: (0, utils_1.toPublicKey)(tokenPaymentAccount),
            isSigner: false,
            isWritable: true,
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
            pubkey: (0, utils_1.toPublicKey)(auctionDataExtended),
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
exports.redeemParticipationBidV3 = redeemParticipationBidV3;
//# sourceMappingURL=redeemParticipationBidV3.js.map