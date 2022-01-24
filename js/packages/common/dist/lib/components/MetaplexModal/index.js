"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaplexModal = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const MetaplexModal = (props) => {
    const { children, bodyStyle, className, ...rest } = props;
    return (react_1.default.createElement(antd_1.Modal, { bodyStyle: {
            background: '#2F2F2F',
            boxShadow: '0px 20px 12px 8px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            ...bodyStyle,
        }, className: `modal-box small-modal ${className}`, footer: null, width: 500, ...rest }, children));
};
exports.MetaplexModal = MetaplexModal;
//# sourceMappingURL=index.js.map