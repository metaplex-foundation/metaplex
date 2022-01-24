"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeAccountsChange = void 0;
const utils_1 = require("../../utils");
const loadAccounts_1 = require("./loadAccounts");
const onChangeAccount_1 = require("./onChangeAccount");
const processAuctions_1 = require("./processAuctions");
const processMetaData_1 = require("./processMetaData");
const processMetaplexAccounts_1 = require("./processMetaplexAccounts");
const processVaultData_1 = require("./processVaultData");
const subscribeAccountsChange = (connection, getState, setState) => {
    const subscriptions = [];
    const updateStateValue = (prop, key, value) => {
        const state = getState();
        const nextState = (0, loadAccounts_1.makeSetter)({ ...state })(prop, key, value);
        setState(nextState);
    };
    subscriptions.push(connection.onProgramAccountChange((0, utils_1.toPublicKey)(utils_1.VAULT_ID), (0, onChangeAccount_1.onChangeAccount)(processVaultData_1.processVaultData, updateStateValue)));
    subscriptions.push(connection.onProgramAccountChange((0, utils_1.toPublicKey)(utils_1.AUCTION_ID), (0, onChangeAccount_1.onChangeAccount)(processAuctions_1.processAuctions, updateStateValue)));
    subscriptions.push(connection.onProgramAccountChange((0, utils_1.toPublicKey)(utils_1.METAPLEX_ID), (0, onChangeAccount_1.onChangeAccount)(processMetaplexAccounts_1.processMetaplexAccounts, updateStateValue)));
    subscriptions.push(connection.onProgramAccountChange((0, utils_1.toPublicKey)(utils_1.METADATA_PROGRAM_ID), (0, onChangeAccount_1.onChangeAccount)(processMetaData_1.processMetaData, async (prop, key, value) => {
        const state = { ...getState() };
        const setter = (0, loadAccounts_1.makeSetter)(state);
        let hasChanges = false;
        const updater = (...args) => {
            hasChanges = true;
            setter(...args);
        };
        if (prop === 'metadataByMint') {
            await (0, loadAccounts_1.initMetadata)(value, state.whitelistedCreatorsByCreator, updater);
        }
        else {
            updater(prop, key, value);
        }
        if (hasChanges) {
            setState(state);
        }
    })));
    return () => {
        subscriptions.forEach(subscriptionId => {
            connection.removeProgramAccountChangeListener(subscriptionId);
        });
    };
};
exports.subscribeAccountsChange = subscribeAccountsChange;
//# sourceMappingURL=subscribeAccountsChange.js.map