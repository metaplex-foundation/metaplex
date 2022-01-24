"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAuctions = void 0;
const actions_1 = require("../../actions");
const utils_1 = require("../../utils");
const accounts_1 = require("../accounts");
const processAuctions = ({ account, pubkey }, setter) => {
    if (!isAuctionAccount(account))
        return;
    try {
        const parsedAccount = accounts_1.cache.add(pubkey, account, actions_1.AuctionParser, false);
        setter('auctions', pubkey, parsedAccount);
    }
    catch (e) {
        // ignore errors
        // add type as first byte for easier deserialization
    }
    try {
        if (isExtendedAuctionAccount(account)) {
            const parsedAccount = accounts_1.cache.add(pubkey, account, actions_1.AuctionDataExtendedParser, false);
            setter('auctionDataExtended', pubkey, parsedAccount);
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
    try {
        if (isBidderMetadataAccount(account)) {
            const parsedAccount = accounts_1.cache.add(pubkey, account, actions_1.BidderMetadataParser, false);
            setter('bidderMetadataByAuctionAndBidder', parsedAccount.info.auctionPubkey +
                '-' +
                parsedAccount.info.bidderPubkey, parsedAccount);
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
    try {
        if (isBidderPotAccount(account)) {
            const parsedAccount = accounts_1.cache.add(pubkey, account, actions_1.BidderPotParser, false);
            setter('bidderPotsByAuctionAndBidder', parsedAccount.info.auctionAct + '-' + parsedAccount.info.bidderAct, parsedAccount);
        }
    }
    catch {
        // ignore errors
        // add type as first byte for easier deserialization
    }
};
exports.processAuctions = processAuctions;
const isAuctionAccount = account => account && (0, utils_1.pubkeyToString)(account.owner) === utils_1.AUCTION_ID;
const isExtendedAuctionAccount = account => account.data.length === actions_1.MAX_AUCTION_DATA_EXTENDED_SIZE;
const isBidderMetadataAccount = account => account.data.length === actions_1.BIDDER_METADATA_LEN;
const isBidderPotAccount = account => account.data.length === actions_1.BIDDER_POT_LEN;
//# sourceMappingURL=processAuctions.js.map