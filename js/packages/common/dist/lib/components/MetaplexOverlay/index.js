"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaplexOverlay = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const MetaplexOverlay = (props) => {
    const { children, ...rest } = props;
    const content = (react_1.default.createElement("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'auto',
            justifyContent: 'center',
        } }, children));
    return (react_1.default.createElement(antd_1.Modal, { centered: true, modalRender: () => content, width: '100vw', mask: false, ...rest }));
};
exports.MetaplexOverlay = MetaplexOverlay;
//# sourceMappingURL=index.js.map