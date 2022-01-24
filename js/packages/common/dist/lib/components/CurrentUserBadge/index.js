"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUserBadge = void 0;
const react_1 = __importDefault(require("react"));
const web3_js_1 = require("@solana/web3.js");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const accounts_1 = require("../../contexts/accounts");
const utils_1 = require("../../utils");
const antd_1 = require("antd");
const Settings_1 = require("../Settings");
const CurrentUserBadge = (props) => {
    const { wallet, publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const { account } = (0, accounts_1.useNativeAccount)();
    if (!wallet || !publicKey) {
        return null;
    }
    const iconStyle = props.showAddress
        ? {
            marginLeft: '0.5rem',
            display: 'flex',
            width: props.iconSize || 20,
            borderRadius: 50,
        }
        : {
            display: 'flex',
            width: props.iconSize || 20,
            paddingLeft: 0,
            borderRadius: 50,
        };
    const baseWalletKey = {
        height: props.iconSize,
        cursor: 'pointer',
        userSelect: 'none',
    };
    const walletKeyStyle = props.showAddress
        ? baseWalletKey
        : { ...baseWalletKey, paddingLeft: 0 };
    return (react_1.default.createElement("div", { className: "wallet-wrapper" },
        props.showBalance && (react_1.default.createElement("span", null,
            utils_1.formatNumber.format(((account === null || account === void 0 ? void 0 : account.lamports) || 0) / web3_js_1.LAMPORTS_PER_SOL),
            " SOL")),
        react_1.default.createElement(antd_1.Popover, { placement: "topRight", title: "Settings", content: react_1.default.createElement(Settings_1.Settings, null), trigger: "click" },
            react_1.default.createElement("div", { className: "wallet-key", style: walletKeyStyle },
                react_1.default.createElement("span", { style: { marginRight: '0.5rem' } }, wallet.name),
                react_1.default.createElement("img", { src: wallet.icon, style: iconStyle })))));
};
exports.CurrentUserBadge = CurrentUserBadge;
//# sourceMappingURL=index.js.map