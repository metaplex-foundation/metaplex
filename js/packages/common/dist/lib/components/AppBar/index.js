"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppBar = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const CurrentUserBadge_1 = require("../CurrentUserBadge");
const icons_1 = require("@ant-design/icons");
const Settings_1 = require("../Settings");
const labels_1 = require("../../constants/labels");
const __1 = require("..");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const AppBar = (props) => {
    const { connected } = (0, wallet_adapter_react_1.useWallet)();
    const TopBar = (react_1.default.createElement("div", { className: "App-Bar-right" },
        props.left,
        connected ? (react_1.default.createElement(CurrentUserBadge_1.CurrentUserBadge, null)) : (react_1.default.createElement(__1.ConnectButton, { type: "text", size: "large", style: { color: '#2abdd2' }, allowWalletChange: true })),
        react_1.default.createElement(antd_1.Popover, { placement: "topRight", title: labels_1.LABELS.SETTINGS_TOOLTIP, content: react_1.default.createElement(Settings_1.Settings, { additionalSettings: props.additionalSettings }), trigger: "click" },
            react_1.default.createElement(antd_1.Button, { shape: "circle", size: "large", type: "text", icon: react_1.default.createElement(icons_1.SettingOutlined, null) })),
        props.right));
    return TopBar;
};
exports.AppBar = AppBar;
//# sourceMappingURL=index.js.map