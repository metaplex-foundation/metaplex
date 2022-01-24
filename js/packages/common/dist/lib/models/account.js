"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approve = exports.ParsedDataLayout = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const ids_1 = require("../utils/ids");
const buffer_layout_1 = __importDefault(require("buffer-layout"));
exports.ParsedDataLayout = buffer_layout_1.default.struct([
    buffer_layout_1.default.blob(32, 'amount'),
    buffer_layout_1.default.u8('toChain'),
    buffer_layout_1.default.blob(32, 'sourceAddress'),
    buffer_layout_1.default.blob(32, 'targetAddress'),
    buffer_layout_1.default.blob(32, 'assetAddress'),
    buffer_layout_1.default.u8('assetChain'),
    buffer_layout_1.default.u8('assetDecimals'),
    buffer_layout_1.default.seq(buffer_layout_1.default.u8(), 1),
    buffer_layout_1.default.u32('nonce'),
    buffer_layout_1.default.blob(1001, 'vaa'),
    buffer_layout_1.default.seq(buffer_layout_1.default.u8(), 3),
    buffer_layout_1.default.u32('vaaTime'),
    buffer_layout_1.default.u32('lockupTime'),
    buffer_layout_1.default.u8('pokeCounter'),
    buffer_layout_1.default.blob(32, 'signatureAccount'),
    buffer_layout_1.default.u8('initialized'),
]);
function approve(instructions, cleanupInstructions, account, owner, amount, autoRevoke = true, 
// if delegate is not passed ephemeral transfer authority is used
delegate, existingTransferAuthority) {
    const tokenProgram = ids_1.TOKEN_PROGRAM_ID;
    const transferAuthority = existingTransferAuthority || web3_js_1.Keypair.generate();
    //const delegateKey = delegate ?? transferAuthority.publicKey;
    instructions.push(spl_token_1.Token.createApproveInstruction(tokenProgram, account, delegate !== null && delegate !== void 0 ? delegate : transferAuthority.publicKey, owner, [], amount));
    if (autoRevoke) {
        cleanupInstructions.push(spl_token_1.Token.createRevokeInstruction(tokenProgram, account, owner, []));
    }
    return transferAuthority;
}
exports.approve = approve;
//# sourceMappingURL=account.js.map