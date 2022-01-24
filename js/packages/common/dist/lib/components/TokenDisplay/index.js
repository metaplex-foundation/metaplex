"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenDisplay = void 0;
const react_1 = __importDefault(require("react"));
const accounts_1 = require("../../contexts/accounts");
const hooks_1 = require("../../hooks");
const TokenIcon_1 = require("../TokenIcon");
const TokenDisplay = (props) => {
    const { showBalance, mintAddress, name, icon } = props;
    const tokenMint = (0, accounts_1.useMint)(mintAddress);
    const tokenAccount = (0, hooks_1.useAccountByMint)(mintAddress);
    let balance = 0;
    let hasBalance = false;
    if (showBalance) {
        if (tokenAccount && tokenMint) {
            balance =
                tokenAccount.info.amount.toNumber() / Math.pow(10, tokenMint.decimals);
            hasBalance = balance > 0;
        }
    }
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement("div", { title: mintAddress, key: mintAddress, style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            } },
            react_1.default.createElement("div", { style: { display: 'flex', alignItems: 'center' } },
                icon || react_1.default.createElement(TokenIcon_1.TokenIcon, { mintAddress: mintAddress }),
                name),
            showBalance ? (react_1.default.createElement("span", { title: balance.toString(), key: mintAddress, className: "token-balance" },
                "\u00A0",
                ' ',
                hasBalance
                    ? balance < 0.001
                        ? '<0.001'
                        : balance.toFixed(3)
                    : '-')) : null)));
};
exports.TokenDisplay = TokenDisplay;
//# sourceMappingURL=index.js.map