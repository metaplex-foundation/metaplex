"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const react_1 = __importStar(require("react"));
const antd_1 = require("antd");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const connection_1 = require("../../contexts/connection");
const contexts_1 = require("../../contexts");
const utils_1 = require("../../utils");
const icons_1 = require("@ant-design/icons");
const Identicon_1 = require("../Identicon");
const Settings = ({ additionalSettings, }) => {
    const { connected, disconnect, publicKey } = (0, wallet_adapter_react_1.useWallet)();
    const { endpoint } = (0, connection_1.useConnectionConfig)();
    const { setVisible } = (0, contexts_1.useWalletModal)();
    const open = (0, react_1.useCallback)(() => setVisible(true), [setVisible]);
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement("div", { style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '15px 0',
            } },
            react_1.default.createElement(Identicon_1.Identicon, { address: publicKey === null || publicKey === void 0 ? void 0 : publicKey.toBase58(), style: {
                    width: 48,
                } }),
            publicKey && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(antd_1.Tooltip, { title: "Address copied" },
                    react_1.default.createElement("div", { style: {
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: '#FFFFFF',
                        }, onClick: () => navigator.clipboard.writeText((publicKey === null || publicKey === void 0 ? void 0 : publicKey.toBase58()) || '') },
                        react_1.default.createElement(icons_1.CopyOutlined, null),
                        "\u00A0",
                        (0, utils_1.shortenAddress)(publicKey === null || publicKey === void 0 ? void 0 : publicKey.toBase58()))))),
            react_1.default.createElement("br", null),
            react_1.default.createElement("span", { style: {
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    width: 'calc(100% + 32px)',
                    marginBottom: 10,
                } }),
            additionalSettings)));
};
exports.Settings = Settings;
//# sourceMappingURL=index.js.map