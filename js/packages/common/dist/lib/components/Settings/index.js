"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const utils_1 = require("../../utils");
const icons_1 = require("@ant-design/icons");
const Identicon_1 = require("../Identicon");
const Settings = ({ additionalSettings, }) => {
    const { publicKey } = (0, wallet_adapter_react_1.useWallet)();
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement("div", { className: "flex flex-col items-center justify-center w-full gap-[8px] p-[16px] border-b border-gray-700" },
            react_1.default.createElement(Identicon_1.Identicon, { address: publicKey === null || publicKey === void 0 ? void 0 : publicKey.toBase58(), style: {
                    width: 48,
                } }),
            publicKey && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(antd_1.Tooltip, { title: "Address copied" },
                    react_1.default.createElement("div", { className: "flex items-center gap-[4px] text-white font-500", onClick: () => navigator.clipboard.writeText((publicKey === null || publicKey === void 0 ? void 0 : publicKey.toBase58()) || '') },
                        react_1.default.createElement(icons_1.CopyOutlined, null),
                        (0, utils_1.shortenAddress)(publicKey === null || publicKey === void 0 ? void 0 : publicKey.toBase58())))))),
        react_1.default.createElement("div", { className: "flex" }, additionalSettings)));
};
exports.Settings = Settings;
//# sourceMappingURL=index.js.map