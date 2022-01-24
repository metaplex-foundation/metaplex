"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackButton = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const constants_1 = require("../../constants");
const react_router_dom_1 = require("react-router-dom");
const BackButton = () => {
    const history = (0, react_router_dom_1.useHistory)();
    return (react_1.default.createElement(antd_1.Button, { type: "text", onClick: history.goBack }, constants_1.LABELS.GO_BACK_ACTION));
};
exports.BackButton = BackButton;
//# sourceMappingURL=index.js.map