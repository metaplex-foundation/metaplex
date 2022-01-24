"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetCostToStore = exports.ARWEAVE_UPLOAD_ENDPOINT = exports.LAMPORT_MULTIPLIER = void 0;
const arweave_cost_1 = require("@metaplex/arweave-cost");
const web3_js_1 = require("@solana/web3.js");
exports.LAMPORT_MULTIPLIER = web3_js_1.LAMPORTS_PER_SOL;
exports.ARWEAVE_UPLOAD_ENDPOINT = 'https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile';
async function getAssetCostToStore(files) {
    const sizes = files.map(f => f.size);
    const result = await (0, arweave_cost_1.calculate)(sizes);
    return web3_js_1.LAMPORTS_PER_SOL * result.solana;
}
exports.getAssetCostToStore = getAssetCostToStore;
//# sourceMappingURL=assets.js.map