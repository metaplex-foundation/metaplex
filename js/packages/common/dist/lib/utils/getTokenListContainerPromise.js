"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenListContainerPromise = void 0;
const spl_token_registry_1 = require("@solana/spl-token-registry");
let _cachedTokenListContainerPromise;
function getTokenListContainerPromise() {
    if (_cachedTokenListContainerPromise == null) {
        _cachedTokenListContainerPromise = new spl_token_registry_1.TokenListProvider().resolve();
    }
    return _cachedTokenListContainerPromise;
}
exports.getTokenListContainerPromise = getTokenListContainerPromise;
//# sourceMappingURL=getTokenListContainerPromise.js.map