"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMetaData = void 0;
const isValidHttpUrl_1 = require("../../utils/isValidHttpUrl");
const actions_1 = require("../../actions");
const utils_1 = require("../../utils");
const processMetaData = async ({ account, pubkey }, setter) => {
    if (!isMetadataAccount(account))
        return;
    try {
        if (isMetadataV1Account(account)) {
            const metadata = (0, actions_1.decodeMetadata)(account.data);
            if ((0, isValidHttpUrl_1.isValidHttpUrl)(metadata.data.uri)) {
                const parsedAccount = {
                    pubkey,
                    account,
                    info: metadata,
                };
                await setter('metadataByMint', metadata.mint, parsedAccount);
                await setter('metadataByMetadata', pubkey, parsedAccount);
            }
        }
        if (isEditionV1Account(account)) {
            const edition = (0, actions_1.decodeEdition)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: edition,
            };
            setter('editions', pubkey, parsedAccount);
        }
        if (isMasterEditionAccount(account)) {
            const masterEdition = (0, actions_1.decodeMasterEdition)(account.data);
            if (isMasterEditionV1(masterEdition)) {
                const parsedAccount = {
                    pubkey,
                    account,
                    info: masterEdition,
                };
                setter('masterEditions', pubkey, parsedAccount);
                setter('masterEditionsByPrintingMint', masterEdition.printingMint, parsedAccount);
                setter('masterEditionsByOneTimeAuthMint', masterEdition.oneTimePrintingAuthorizationMint, parsedAccount);
            }
            else {
                const parsedAccount = {
                    pubkey,
                    account,
                    info: masterEdition,
                };
                setter('masterEditions', pubkey, parsedAccount);
            }
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
};
exports.processMetaData = processMetaData;
const isMetadataAccount = (account) => account && (0, utils_1.pubkeyToString)(account.owner) === utils_1.METADATA_PROGRAM_ID;
const isMetadataV1Account = (account) => account.data[0] === actions_1.MetadataKey.MetadataV1;
const isEditionV1Account = (account) => account.data[0] === actions_1.MetadataKey.EditionV1;
const isMasterEditionAccount = (account) => account.data[0] === actions_1.MetadataKey.MasterEditionV1 ||
    account.data[0] === actions_1.MetadataKey.MasterEditionV2;
const isMasterEditionV1 = (me) => {
    return me.key === actions_1.MetadataKey.MasterEditionV1;
};
//# sourceMappingURL=processMetaData.js.map