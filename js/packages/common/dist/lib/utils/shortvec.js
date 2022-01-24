"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeLength = exports.decodeLength = void 0;
function decodeLength(bytes) {
    let len = 0;
    let size = 0;
    for (;;) {
        const elem = bytes.shift();
        //@ts-ignore
        len |= (elem & 0x7f) << (size * 7);
        size += 1;
        //@ts-ignore
        if ((elem & 0x80) === 0) {
            break;
        }
    }
    return len;
}
exports.decodeLength = decodeLength;
function encodeLength(bytes, len) {
    let rem_len = len;
    for (;;) {
        let elem = rem_len & 0x7f;
        rem_len >>= 7;
        if (rem_len === 0) {
            bytes.push(elem);
            break;
        }
        else {
            elem |= 0x80;
            bytes.push(elem);
        }
    }
}
exports.encodeLength = encodeLength;
//# sourceMappingURL=shortvec.js.map