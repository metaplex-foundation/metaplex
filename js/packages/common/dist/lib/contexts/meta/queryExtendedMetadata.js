"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryExtendedMetadata = void 0;
const accounts_1 = require("../accounts");
const accounts_2 = require("../accounts");
const accounts_3 = require("../accounts");
const queryExtendedMetadata = async (connection, mintToMeta) => {
    const mintToMetadata = { ...mintToMeta };
    const mints = await (0, accounts_2.getMultipleAccounts)(connection, [...Object.keys(mintToMetadata)].filter(k => !accounts_1.cache.get(k)), 'single');
    mints.keys.forEach((key, index) => {
        const mintAccount = mints.array[index];
        if (mintAccount) {
            const mint = accounts_1.cache.add(key, mintAccount, accounts_3.MintParser, false);
            if (!mint.info.supply.eqn(1) || mint.info.decimals !== 0) {
                // naive not NFT check
                delete mintToMetadata[key];
            }
            else {
                // const metadata = mintToMetadata[key];
            }
        }
    });
    // await Promise.all([...extendedMetadataFetch.values()]);
    const metadata = [...Object.values(mintToMetadata)];
    return {
        metadata,
        mintToMetadata,
    };
};
exports.queryExtendedMetadata = queryExtendedMetadata;
//# sourceMappingURL=queryExtendedMetadata.js.map