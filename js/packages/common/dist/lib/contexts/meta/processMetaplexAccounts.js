"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMetaplexAccounts = void 0;
const web3_js_1 = require("@solana/web3.js");
const models_1 = require("../../models");
const utils_1 = require("../../utils");
const accounts_1 = require("../accounts");
const userNames_json_1 = __importDefault(require("../../config/userNames.json"));
const processMetaplexAccounts = async ({ account, pubkey }, setter) => {
    if (!isMetaplexAccount(account))
        return;
    try {
        const STORE_ID = (0, utils_1.programIds)().store;
        if (isAuctionManagerV1Account(account) ||
            isAuctionManagerV2Account(account)) {
            const storeKey = new web3_js_1.PublicKey(account.data.slice(1, 33));
            if (STORE_ID && storeKey.equals(STORE_ID)) {
                const auctionManager = (0, models_1.decodeAuctionManager)(account.data);
                const parsedAccount = {
                    pubkey,
                    account,
                    info: auctionManager,
                };
                setter('auctionManagersByAuction', auctionManager.auction, parsedAccount);
            }
        }
        if (isBidRedemptionTicketV1Account(account) ||
            isBidRedemptionTicketV2Account(account)) {
            const ticket = (0, models_1.decodeBidRedemptionTicket)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: ticket,
            };
            setter('bidRedemptions', pubkey, parsedAccount);
            if (ticket.key == models_1.MetaplexKey.BidRedemptionTicketV2) {
                const asV2 = ticket;
                if (asV2.winnerIndex) {
                    setter('bidRedemptionV2sByAuctionManagerAndWinningIndex', asV2.auctionManager + '-' + asV2.winnerIndex.toNumber(), parsedAccount);
                }
            }
        }
        if (isPayoutTicketV1Account(account)) {
            const ticket = (0, models_1.decodePayoutTicket)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: ticket,
            };
            setter('payoutTickets', pubkey, parsedAccount);
        }
        if (isAuctionCacheV1Account(account)) {
            const cache = (0, models_1.decodeAuctionCache)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: cache,
            };
            setter('auctionCaches', pubkey, parsedAccount);
        }
        if (isStoreIndexerV1Account(account)) {
            const indexer = (0, models_1.decodeStoreIndexer)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: indexer,
            };
            if (parsedAccount.info.store == (STORE_ID === null || STORE_ID === void 0 ? void 0 : STORE_ID.toBase58())) {
                setter('storeIndexer', pubkey, parsedAccount);
            }
        }
        if (isPrizeTrackingTicketV1Account(account)) {
            const ticket = (0, models_1.decodePrizeTrackingTicket)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: ticket,
            };
            setter('prizeTrackingTickets', pubkey, parsedAccount);
        }
        if (isStoreV1Account(account)) {
            const store = (0, models_1.decodeStore)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: store,
            };
            if (STORE_ID && pubkey === STORE_ID.toBase58()) {
                setter('store', pubkey, parsedAccount);
            }
        }
        if (isSafetyDepositConfigV1Account(account)) {
            const config = (0, models_1.decodeSafetyDepositConfig)(account.data);
            const parsedAccount = {
                pubkey,
                account,
                info: config,
            };
            setter('safetyDepositConfigsByAuctionManagerAndIndex', config.auctionManager + '-' + config.order.toNumber(), parsedAccount);
        }
        if (isWhitelistedCreatorV1Account(account)) {
            const parsedAccount = accounts_1.cache.add(pubkey, account, models_1.WhitelistedCreatorParser, false);
            // TODO: figure out a way to avoid generating creator addresses during parsing
            // should we store store id inside creator?
            if (STORE_ID) {
                const isWhitelistedCreator = await (0, models_1.isCreatorPartOfTheStore)(parsedAccount.info.address, pubkey);
                const nameInfo = userNames_json_1.default[parsedAccount.info.address];
                if (nameInfo) {
                    parsedAccount.info = { ...parsedAccount.info, ...nameInfo };
                }
                if (isWhitelistedCreator) {
                    setter('whitelistedCreatorsByCreator', parsedAccount.info.address, parsedAccount);
                }
            }
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
};
exports.processMetaplexAccounts = processMetaplexAccounts;
const isMetaplexAccount = (account) => account && (0, utils_1.pubkeyToString)(account.owner) === utils_1.METAPLEX_ID;
const isAuctionManagerV1Account = (account) => account.data[0] === models_1.MetaplexKey.AuctionManagerV1;
const isAuctionManagerV2Account = (account) => account.data[0] === models_1.MetaplexKey.AuctionManagerV2;
const isBidRedemptionTicketV1Account = (account) => account.data[0] === models_1.MetaplexKey.BidRedemptionTicketV1;
const isBidRedemptionTicketV2Account = (account) => account.data[0] === models_1.MetaplexKey.BidRedemptionTicketV2;
const isPayoutTicketV1Account = (account) => account.data[0] === models_1.MetaplexKey.PayoutTicketV1;
const isPrizeTrackingTicketV1Account = (account) => account.data[0] === models_1.MetaplexKey.PrizeTrackingTicketV1;
const isStoreV1Account = (account) => account.data[0] === models_1.MetaplexKey.StoreV1;
const isSafetyDepositConfigV1Account = (account) => account.data[0] === models_1.MetaplexKey.SafetyDepositConfigV1;
const isWhitelistedCreatorV1Account = (account) => account.data[0] === models_1.MetaplexKey.WhitelistedCreatorV1;
const isAuctionCacheV1Account = (account) => account.data[0] === models_1.MetaplexKey.AuctionCacheV1;
const isStoreIndexerV1Account = (account) => account.data[0] === models_1.MetaplexKey.StoreIndexerV1;
//# sourceMappingURL=processMetaplexAccounts.js.map