"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtherscanLink = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const utils_1 = require("../../utils/utils");
const EtherscanLink = (props) => {
    var _a;
    const { type, code } = props;
    const address = props.address;
    if (!address) {
        return null;
    }
    const length = (_a = props.length) !== null && _a !== void 0 ? _a : 9;
    return (react_1.default.createElement("a", { href: `https://etherscan.io/${type}/${address}`, 
        // eslint-disable-next-line react/jsx-no-target-blank
        target: "_blank", title: address, style: props.style, rel: "noreferrer" }, code ? (react_1.default.createElement(antd_1.Typography.Text, { style: props.style, code: true }, (0, utils_1.shortenAddress)(address, length))) : ((0, utils_1.shortenAddress)(address, length))));
};
exports.EtherscanLink = EtherscanLink;
//# sourceMappingURL=index.js.map