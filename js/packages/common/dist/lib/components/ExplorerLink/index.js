"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplorerLink = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const utils_1 = require("../../utils/utils");
const ExplorerLink = (props) => {
    var _a, _b;
    const { type, code } = props;
    const address = typeof props.address === 'string'
        ? props.address
        : (_a = props.address) === null || _a === void 0 ? void 0 : _a.toBase58();
    if (!address) {
        return null;
    }
    const length = (_b = props.length) !== null && _b !== void 0 ? _b : 9;
    return (react_1.default.createElement("a", { href: `https://explorer.solana.com/${type}/${address}`, 
        // eslint-disable-next-line react/jsx-no-target-blank
        target: "_blank", title: address, style: props.style, rel: "noreferrer" }, code ? (react_1.default.createElement(antd_1.Typography.Text, { style: props.style, code: true }, (0, utils_1.shortenAddress)(address, length))) : ((0, utils_1.shortenAddress)(address, length))));
};
exports.ExplorerLink = ExplorerLink;
//# sourceMappingURL=index.js.map