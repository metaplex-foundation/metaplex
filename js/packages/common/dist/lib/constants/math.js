"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZERO = exports.RAY = exports.WAD = exports.HALF_WAD = exports.TEN = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
exports.TEN = new bn_js_1.default(10);
exports.HALF_WAD = exports.TEN.pow(new bn_js_1.default(18));
exports.WAD = exports.TEN.pow(new bn_js_1.default(18));
exports.RAY = exports.TEN.pow(new bn_js_1.default(27));
exports.ZERO = new bn_js_1.default(0);
//# sourceMappingURL=math.js.map