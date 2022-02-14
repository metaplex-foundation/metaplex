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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectButton = void 0;
const react_1 = __importStar(require("react"));
const classnames_1 = __importDefault(require("classnames"));
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const ui_components_1 = require("../../ui-components");
const contexts_1 = require("../../contexts");
const utils_1 = require("../../utils");
const ConnectButton = (props) => {
    const { children, disabled, allowWalletChange, ...rest } = props;
    const { wallet, connect, connected } = (0, wallet_adapter_react_1.useWallet)();
    const { isMobile, isDesktop } = (0, utils_1.useViewport)();
    const { setVisible } = (0, contexts_1.useWalletModal)();
    const open = (0, react_1.useCallback)(() => setVisible(true), [setVisible]);
    const handleClick = (0, react_1.useCallback)(() => (wallet ? connect().catch(() => { }) : open()), [wallet, connect, open]);
    // only show if wallet selected or user connected
    const renderButton = () => {
        if (!isDesktop) {
            if (connected) {
                return children;
            }
            else {
                return react_1.default.createElement("i", { className: 'ri-wallet-fill inline-flex' });
            }
        }
        else {
            if (connected) {
                return children;
            }
            else {
                return 'Connect wallet';
            }
        }
    };
    if (!wallet || !allowWalletChange) {
        return (react_1.default.createElement(ui_components_1.Button, { view: !isDesktop ? 'solid' : 'outline', appearance: isDesktop && 'ghost-invert', className: !isDesktop &&
                (0, classnames_1.default)('hover:!text-B-400 focus:!text-B-400 ml-[4px] px-[8px] text-white hover:!bg-white focus:!bg-white'), onClick: (e) => {
                props.onClick ? props.onClick(e) : null;
                handleClick();
            }, disabled: connected && disabled, ...rest }, renderButton()));
    }
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(ui_components_1.Button, { size: 'lg', onClick: handleClick, disabled: connected && disabled, className: 'hover:!text-B-400 focus:!text-B-400 hover:!bg-white focus:!bg-white' }, isMobile ? react_1.default.createElement("i", { className: 'ri-wallet-fill inline-flex' }) : 'Connect'),
        react_1.default.createElement(ui_components_1.Dropdown, null, ({ isOpen, setIsOpen }) => {
            return (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement(ui_components_1.DropDownToggle, { onClick: () => setIsOpen(!isOpen) },
                    react_1.default.createElement(ui_components_1.Button, { size: 'lg', className: 'hover:!text-B-400 focus:!text-B-400 px-[8px] hover:!bg-white focus:!bg-white' },
                        react_1.default.createElement("i", { className: 'ri-arrow-down-s-line flex' }))),
                isOpen && (react_1.default.createElement(ui_components_1.DropDownBody, { align: 'right', className: 'shadow-B-700/5 border-B-10 w-[200px] border-x border-b shadow-lg' },
                    react_1.default.createElement(ui_components_1.DropDownMenuItem, { onClick: open }, "Change Wallet")))));
        })));
};
exports.ConnectButton = ConnectButton;
//# sourceMappingURL=index.js.map