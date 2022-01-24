"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolIcon = exports.TokenIcon = void 0;
const react_1 = __importDefault(require("react"));
const utils_1 = require("../../utils");
const connection_1 = require("../../contexts/connection");
const Identicon_1 = require("../Identicon");
const TokenIcon = (props) => {
    var _a, _b;
    let icon = '';
    if (props.tokenMap) {
        icon = (0, utils_1.getTokenIcon)(props.tokenMap, props.mintAddress);
    }
    else {
        const { tokens } = (0, connection_1.useConnectionConfig)();
        icon = (0, utils_1.getTokenIcon)(tokens, props.mintAddress);
    }
    const size = props.size || 20;
    if (icon) {
        return (react_1.default.createElement("img", { alt: "Token icon", className: props.className, key: icon, width: ((_a = props.style) === null || _a === void 0 ? void 0 : _a.width) || size.toString(), height: ((_b = props.style) === null || _b === void 0 ? void 0 : _b.height) || size.toString(), src: icon, style: {
                marginRight: '0.5rem',
                marginTop: '0.11rem',
                borderRadius: '10rem',
                backgroundColor: 'white',
                backgroundClip: 'padding-box',
                ...props.style,
            } }));
    }
    return (react_1.default.createElement(Identicon_1.Identicon, { address: props.mintAddress, style: {
            marginRight: '0.5rem',
            width: size,
            height: size,
            marginTop: 2,
            ...props.style,
        } }));
};
exports.TokenIcon = TokenIcon;
const PoolIcon = (props) => {
    return (react_1.default.createElement("div", { className: props.className, style: { display: 'flex' } },
        react_1.default.createElement(exports.TokenIcon, { mintAddress: props.mintA, style: { marginRight: '-0.5rem', ...props.style } }),
        react_1.default.createElement(exports.TokenIcon, { mintAddress: props.mintB })));
};
exports.PoolIcon = PoolIcon;
//# sourceMappingURL=index.js.map