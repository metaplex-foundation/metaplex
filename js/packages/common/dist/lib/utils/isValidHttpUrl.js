"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidHttpUrl = void 0;
function isValidHttpUrl(text) {
    if (text.startsWith('http:') || text.startsWith('https:')) {
        return true;
    }
    return false;
}
exports.isValidHttpUrl = isValidHttpUrl;
//# sourceMappingURL=isValidHttpUrl.js.map