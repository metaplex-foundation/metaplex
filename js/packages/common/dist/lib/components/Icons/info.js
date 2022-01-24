"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Info = void 0;
const antd_1 = require("antd");
const react_1 = __importDefault(require("react"));
const icons_1 = require("@ant-design/icons");
const Info = (props) => {
    return (react_1.default.createElement(antd_1.Popover, { trigger: "hover", content: react_1.default.createElement("div", { style: { width: 300 } }, props.text) },
        react_1.default.createElement(antd_1.Button, { type: "text", shape: "circle" },
            react_1.default.createElement(icons_1.InfoCircleOutlined, { style: props.style }))));
};
exports.Info = Info;
//# sourceMappingURL=info.js.map