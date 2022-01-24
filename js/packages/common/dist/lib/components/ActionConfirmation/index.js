"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionConfirmation = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
const constants_1 = require("../../constants");
const react_router_dom_1 = require("react-router-dom");
const ActionConfirmation = (props) => {
    return (react_1.default.createElement("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
        } },
        react_1.default.createElement("h2", null, "Congratulations!"),
        react_1.default.createElement("div", null, "Your action has been successfully executed"),
        react_1.default.createElement("div", { className: "success-icon" }),
        react_1.default.createElement(react_router_dom_1.Link, { to: "/dashboard" },
            react_1.default.createElement(antd_1.Button, { type: "primary" }, constants_1.LABELS.DASHBOARD_ACTION)),
        react_1.default.createElement(antd_1.Button, { type: "text", onClick: props.onClose }, constants_1.LABELS.GO_BACK_ACTION)));
};
exports.ActionConfirmation = ActionConfirmation;
//# sourceMappingURL=index.js.map