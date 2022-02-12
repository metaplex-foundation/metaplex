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
exports.Dropdown = exports.DropDownMenuItem = exports.DropDownToggle = exports.DropDownBody = void 0;
const react_1 = __importStar(require("react"));
const classnames_1 = __importDefault(require("classnames"));
const useOutsideClick_1 = require("../../utils/useOutsideClick");
const DropDownBody = ({ children, className, width, align, }) => {
    return (react_1.default.createElement("div", { className: (0, classnames_1.default)('absolute bg-white pt-[12px] pb-[8px] px-[8px] rounded-[8px] z-[1100]', {
            'right-0': align === 'right',
            'left-0': align === 'left',
            'left-1/2 transform -translate-x-1/2': align === 'center',
        }, className), style: { width: typeof width === 'number' ? `${width}px` : width } }, children));
};
exports.DropDownBody = DropDownBody;
const DropDownToggle = ({ children, className, onClick, }) => {
    return (react_1.default.createElement("div", { className: (0, classnames_1.default)('flex relative', className), onClick: onClick }, children));
};
exports.DropDownToggle = DropDownToggle;
const DropDownMenuItem = ({ children, className, onClick, iconBefore, }) => {
    return (react_1.default.createElement("div", { className: (0, classnames_1.default)('bg-white py-[4px] px-[8px] rounded-[4px] mb-[4px] text-md ease-in-out duration-100 flex items-center hover:text-B-400 hover:bg-gray-100 cursor-pointer transition-all', className), onClick: onClick },
        iconBefore && (react_1.default.createElement("div", { className: (0, classnames_1.default)('icon mr-[8px] flex-shrink-0') }, iconBefore)),
        react_1.default.createElement("span", null, children)));
};
exports.DropDownMenuItem = DropDownMenuItem;
const Dropdown = ({ children, className, elementID, open, ...restProps }) => {
    const wrapperRef = (0, react_1.useRef)(null);
    const DropdownClasses = (0, classnames_1.default)(`dropdown relative`, className, {});
    const [isOpen, setIsOpen] = (0, react_1.useState)(open);
    const [innerValue, setInnerValue] = (0, react_1.useState)('');
    const [iconBefore, setIconBefore] = (0, react_1.useState)();
    (0, useOutsideClick_1.useOutsideClick)(wrapperRef, () => setIsOpen(false));
    return (react_1.default.createElement("div", { className: DropdownClasses, ...restProps, ref: wrapperRef }, children({
        elementID,
        isOpen,
        setIsOpen,
        innerValue,
        setInnerValue,
        iconBefore,
        setIconBefore,
        ...restProps,
    })));
};
exports.Dropdown = Dropdown;
exports.Dropdown.defaultProps = {};
exports.default = exports.Dropdown;
//# sourceMappingURL=Dropdown.js.map